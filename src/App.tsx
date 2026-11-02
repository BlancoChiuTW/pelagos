import { useEffect, useMemo, useState } from 'react'
import type { Layer } from '@deck.gl/core'
import { MapView, type MapHandles } from './map/MapView'
import { Hud } from './hud/Hud'
import { LayerPanel } from './hud/LayerPanel'
import { Legend } from './hud/Legend'
import { Readout } from './hud/Readout'
import { useOcean } from './data/useOcean'
import { mountOceanRasters, setRasterVisible } from './layers/sst'
import { useStore } from './store'
import { CurrentsCanvas } from './layers/currents/CurrentsCanvas'
import { useFleetItems, useFleetSnapshot } from './data/useFleet'
import { useOthers } from './sim/useOthers'
import { buildLayers } from './map/layerStack'
import { useMapZoom } from './map/useMapZoom'
import { useTicker } from './useTicker'
import { buoyFrame } from './layers/buoys'
import { HOUR } from './sim/geo'
import { AnimatePresence } from 'motion/react'
import { VesselCard } from './hud/VesselCard'
import type { TripEvent } from './data/types'
import { KpiWall } from './hud/KpiWall'
import { PerfHud, useFps } from './hud/PerfHud'
import { SourceBadge } from './hud/SourceBadge'
import { BootSequence } from './hud/BootSequence'
import { useCallback } from 'react'

export default function App() {
  const [h, setHandles] = useState<MapHandles | null>(null)
  const ocean = useOcean()
  const showSst = useStore((s) => s.layers.sst)
  const showAnom = useStore((s) => s.layers.anomaly)
  const showCurrents = useStore((s) => s.layers.currents)
  const fxLow = useStore((s) => s.fx.quality === 'low')
  const grid = ocean.state === 'ok' ? ocean.data : null
  const rawFlags = useStore((s) => s.layers)
  const stage = useStore((s) => s.introStage)
  const intro = useStore((s) => s.intro)
  const setIntro = useStore((s) => s.setIntro)
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
    setRasterVisible(h.map, 'sst', showSst && stage >= 1)
    setRasterVisible(h.map, 'anomaly', showAnom && stage >= 1, 0.8)
  }, [h, grid, showSst, showAnom, stage])

  const othersCount = useStore((s) => s.othersCount)
  const selectedId = useStore((s) => s.selectedVesselId)
  const selectVessel = useStore((s) => s.selectVessel)
  const now = useStore((s) => s.time.now)
  const t = useTicker(500)
  const zoom = useMapZoom(h?.map ?? null)
  const snap = useFleetSnapshot(grid, now)
  const fleet = useFleetItems(snap, t)
  const others = useOthers(grid, othersCount, t, layerFlags.others)
  const selected = fleet.find((f) => f.vessel.id === selectedId) ?? null
  const selectedEvents = useMemo(() => (snap && selectedId ? snap.events.filter((e) => e.vesselId === selectedId) : []), [snap, selectedId])
  // 選船 → 鏡頭移過去（卡片在右側，中心往左偏）
  useEffect(() => {
    if (!h || !selectedId) return
    const item = fleet.find((f) => f.vessel.id === selectedId)
    if (item) h.map.easeTo({ center: [item.pose.lon, item.pose.lat], zoom: Math.max(h.map.getZoom(), 5.2), offset: [-180, 0], duration: 1200 })
    // 只在選擇改變時移動
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h, selectedId])
  const flyToEvent = (e: TripEvent) => h?.map.flyTo({ center: [e.lon, e.lat], zoom: Math.max(h.map.getZoom(), 6), offset: [-180, 0], duration: 1400 })
  const buoys = useMemo(() => (snap ? buoyFrame(snap.buoys, now - 24 * HOUR, t) : null), [snap, now, t])

  const fps = useFps()
  const points = (others?.count ?? 0) + (layerFlags.buoys ? (buoys?.n ?? 0) : 0) + fleet.length
  // 警示數暫以「訊號中斷＋油料 < 20%」計，F13 事件警示流完成後改用 alerts.ts
  const alertCount = fleet.filter((f) => f.status === 'signal_lost' || f.trip.summary.fuelPct < 20).length
  const layers = useMemo<Layer[]>(
    () => buildLayers({ layers: layerFlags, zoom, fleet, others, buoys, selectedId, selectedEvents, onSelect: selectVessel }),
    [layerFlags, zoom, fleet, others, buoys, selectedId, selectedEvents, selectVessel],
  )
  const introDone = useCallback(() => setIntro('done'), [setIntro])
  const bootSteps = [
    { label: '海況網格（NOAA）', ok: grid !== null },
    { label: '船隊／航次／浮標', ok: snap !== null },
    { label: '底圖與圖層引擎', ok: h !== null },
  ]

  return (
    <>
      <MapView layers={layers} onReady={setHandles} />
      {h && grid && <CurrentsCanvas map={h.map} canvas={h.fxCanvas} grid={grid} enabled={showCurrents && stage >= 2} maxParticles={fxLow ? 3000 : 8000} />}
      <div style={{ opacity: stage >= 5 ? 1 : 0, transition: 'opacity 0.6s', position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <Hud
        left={<><LayerPanel /><SourceBadge grid={grid} error={ocean.state === 'error' ? ocean.error : undefined} /></>}
        right={snap ? <KpiWall fleet={fleet} snap={snap} alerts={alertCount} now={t} /> : undefined}
        bottomRight={<PerfHud points={points} fps={fps} />}
        card={<AnimatePresence>{selected && grid && <VesselCard key={selected.vessel.id} item={selected} events={selectedEvents} grid={grid} onEvent={flyToEvent} />}</AnimatePresence>}
        bottomLeft={
          <>
            {h && grid && <Readout map={h.map} ocean={grid} />}
            {grid && <Legend />}
          </>
        }
      />
      </div>
      {intro !== 'done' && <BootSequence map={h?.map ?? null} steps={bootSteps} onDone={introDone} />}
    </>
  )
}
