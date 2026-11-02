import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Layer, PickingInfo } from '@deck.gl/core'
import { AnimatePresence } from 'motion/react'
import { MapView, type MapHandles } from './map/MapView'
import { buildLayers } from './map/layerStack'
import { useMapZoom } from './map/useMapZoom'
import { useOcean } from './data/useOcean'
import { useFleetItems, useFleetSnapshot, type FleetItem } from './data/useFleet'
import type { TripEvent } from './data/types'
import { mountOceanRasters, setRasterVisible } from './layers/sst'
import { CurrentsCanvas } from './layers/currents/CurrentsCanvas'
import { buoyFrame } from './layers/buoys'
import { useOthers } from './sim/useOthers'
import { HOUR } from './sim/geo'
import { STATUS_LABEL } from './sim/status'
import { useStore } from './store'
import { useTicker } from './useTicker'
import { Hud } from './hud/Hud'
import { Sidebar } from './hud/Sidebar'
import { Toolbar } from './hud/Toolbar'
import { LayerPanel } from './hud/LayerPanel'
import { InfoPanel } from './hud/InfoPanel'
import { KpiWall } from './hud/KpiWall'
import { VesselCard } from './hud/VesselCard'
import { PerfHud, useFps } from './hud/PerfHud'
import { BootSequence } from './hud/BootSequence'
import { Placeholder } from './pages/Placeholder'
import { Vessels } from './pages/Vessels'
import { Trips } from './pages/Trips'
import { Alerts } from './pages/Alerts'
import { Buoys } from './pages/Buoys'
import { buildAlerts } from './sim/alerts'
import { useOverrides } from './data/overrides'
import type { Alert } from './data/types'

// 滑過船隻的小卡（V02）
const tooltip = (info: PickingInfo) => {
  const d = info.object as FleetItem | undefined
  if (!d || !d.vessel) return null
  return { html: `<b>${d.vessel.name}</b><br/>${STATUS_LABEL[d.status]} · ${d.pose.sog.toFixed(1)} kn · ${d.pose.cog}°` }
}

export default function App() {
  const [h, setHandles] = useState<MapHandles | null>(null)
  const ocean = useOcean()
  const grid = ocean.state === 'ok' ? ocean.data : null
  const rawFlags = useStore((s) => s.layers)
  const stage = useStore((s) => s.introStage)
  const intro = useStore((s) => s.intro)
  const setIntro = useStore((s) => s.setIntro)
  const view = useStore((s) => s.view)
  const demoMode = useStore((s) => s.demoMode)
  const fxLow = useStore((s) => s.fx.quality === 'low')
  const othersCount = useStore((s) => s.othersCount)
  const selectedId = useStore((s) => s.selectedVesselId)
  const selectVessel = useStore((s) => s.selectVessel)
  const now = useStore((s) => s.time.now)

  // 開機序列：依進度逐層點亮（X01）
  const layerFlags = useMemo(
    () => ({ ...rawFlags, buoys: rawFlags.buoys && stage >= 3, others: rawFlags.others && stage >= 4, fleet: rawFlags.fleet && stage >= 4, track: rawFlags.track && stage >= 4 }),
    [rawFlags, stage],
  )

  useEffect(() => {
    if (h && grid) mountOceanRasters(h.map, grid)
  }, [h, grid])
  useEffect(() => {
    if (!h || !grid) return
    setRasterVisible(h.map, 'sst', rawFlags.sst && stage >= 1)
    setRasterVisible(h.map, 'anomaly', rawFlags.anomaly && stage >= 1, 0.7)
  }, [h, grid, rawFlags.sst, rawFlags.anomaly, stage])

  const t = useTicker(500)
  const zoom = useMapZoom(h?.map ?? null)
  const snap = useFleetSnapshot(grid, now)
  const fleet = useFleetItems(snap, t)
  const others = useOthers(grid, othersCount, t, layerFlags.others)
  const trackStart = now - 24 * HOUR
  const buoys = useMemo(() => (snap && layerFlags.buoys ? buoyFrame(snap.buoys, trackStart, t) : null), [snap, layerFlags.buoys, trackStart, t])
  const selected = fleet.find((f) => f.vessel.id === selectedId) ?? null
  const selectedEvents = useMemo(() => (snap && selectedId ? snap.events.filter((e) => e.vesselId === selectedId) : []), [snap, selectedId])

  // 選船 → 鏡頭移過去（右側面板 360px，中心往左偏）
  useEffect(() => {
    if (!h || !selectedId) return
    const item = fleet.find((f) => f.vessel.id === selectedId)
    if (item) h.map.easeTo({ center: [item.pose.lon, item.pose.lat], zoom: Math.max(h.map.getZoom(), 5.2), offset: [-190, 0], duration: 1200 })
    // 只在選擇改變時移動
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h, selectedId])
  const flyToEvent = (e: TripEvent) => h?.map.flyTo({ center: [e.lon, e.lat], zoom: Math.max(h.map.getZoom(), 6), offset: [-190, 0], duration: 1400 })

  // 管理頁點事件 → 回地圖、選船、飛到事件（等選船的鏡頭移動結束）
  const goEvent = (e: TripEvent) => {
    useStore.getState().setView('map')
    selectVessel(e.vesselId)
    setTimeout(() => flyToEvent(e), 1300)
  }
  const fps = useFps()
  const points = (others?.count ?? 0) + (buoys?.n ?? 0) + fleet.length
  const alerts = useMemo(() => (snap ? buildAlerts(fleet, snap, t) : []), [fleet, snap, t])
  const ack = useOverrides((o) => o.ack)
  const alertCount = alerts.filter((a) => a.level !== 'info' && !ack[a.id]).length
  const locateAlert = (a: Alert) => {
    useStore.getState().setView('map')
    if (a.vesselId) selectVessel(a.vesselId)
    else if (a.lon !== undefined && a.lat !== undefined) h?.map.flyTo({ center: [a.lon, a.lat], zoom: 6 })
  }
  const goBuoy = (lon: number, lat: number) => {
    const st = useStore.getState()
    st.setView('map')
    st.setLayer('buoys', true)
    st.selectVessel(null)
    h?.map.flyTo({ center: [lon, lat], zoom: 7.5, duration: 1600 })
  }

  const layers = useMemo<Layer[]>(
    () => buildLayers({ layers: layerFlags, zoom, fleet, others, buoys, selectedId, selectedEvents, onSelect: selectVessel, trackStart, t }),
    [layerFlags, zoom, fleet, others, buoys, selectedId, selectedEvents, selectVessel, trackStart, t],
  )
  const introDone = useCallback(() => setIntro('done'), [setIntro])
  const bootSteps = [
    { label: '海況網格（NOAA）', ok: grid !== null },
    { label: '船隊／航次／浮標', ok: snap !== null },
    { label: '底圖與圖層引擎', ok: h !== null },
  ]
  const onMap = view === 'map'

  return (
    <>
      <MapView layers={layers} getTooltip={tooltip} onReady={setHandles} />
      {h && grid && <CurrentsCanvas map={h.map} canvas={h.fxCanvas} grid={grid} enabled={rawFlags.currents && stage >= 2 && onMap} maxParticles={fxLow ? 3000 : 6000} />}
      <div style={{ opacity: stage >= 5 ? 1 : 0, transition: 'opacity 0.6s', position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <Sidebar alerts={alertCount} />
        {onMap && <Toolbar fleet={fleet} layers={<LayerPanel />} info={<InfoPanel grid={grid} />} />}
        <Hud
          page={onMap ? undefined : view === 'vessels' ? <Vessels fleet={fleet} now={t} /> : view === 'trips' && snap ? <Trips fleet={fleet} snap={snap} now={t} onEvent={goEvent} />
              : view === 'alerts' ? <Alerts alerts={alerts} onLocate={locateAlert} />
              : view === 'buoys' && snap ? <Buoys snap={snap} fleet={fleet} trackStart={trackStart} now={t} onGo={goBuoy} />
              : <Placeholder view={view} />}
          right={
            <AnimatePresence mode="wait">
              {selected && grid ? (
                <VesselCard key={selected.vessel.id} item={selected} events={selectedEvents} grid={grid} onEvent={flyToEvent} />
              ) : snap ? (
                <KpiWall key="kpi" fleet={fleet} snap={snap} alerts={alertCount} now={t} />
              ) : null}
            </AnimatePresence>
          }
          bottomLeft={demoMode ? <PerfHud points={points} fps={fps} /> : undefined}
        />
      </div>
      {intro !== 'done' && <BootSequence map={h?.map ?? null} steps={bootSteps} onDone={introDone} />}
    </>
  )
}
