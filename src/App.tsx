import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Layer, PickingInfo } from '@deck.gl/core'
import { AnimatePresence } from 'motion/react'
import { MapView, type MapHandles } from './map/MapView'
import { buildLayers } from './map/layerStack'
import { useMapZoom } from './map/useMapZoom'
import { useActivity, useFishingEffort, useOcean, usePorts } from './data/useOcean'
import { useFleetItems, useFleetSnapshot, type FleetItem } from './data/useFleet'
import type { Port, TripEvent } from './data/types'
import { ACTIVITY_LABEL, type ActivityCluster } from './layers/activity'
import { mountOceanRasters, setRasterVisible } from './layers/sst'
import { showGfw } from './layers/gfwRaster'
import { mountEez, setEezVisible } from './layers/eez'
import { CurrentsCanvas } from './layers/currents/CurrentsCanvas'
import { buoyFrame } from './layers/buoys'
import { useOthers } from './sim/useOthers'
import { HOUR } from './sim/geo'
import { STATUS_LABEL } from './sim/status'
import { useStore } from './store'
import { useTicker } from './useTicker'
import { FeatureCard, type Feature } from './hud/FeatureCard'
import { MapContext } from './hud/MapContext'
import { Hud } from './hud/Hud'
import { Sidebar } from './hud/Sidebar'
import { Toolbar } from './hud/Toolbar'
import { LayerPanel } from './hud/LayerPanel'
import { InfoPanel } from './hud/InfoPanel'
import { KpiWall } from './hud/KpiWall'
import { VesselCard } from './hud/VesselCard'
import { PerfHud, useFps } from './hud/PerfHud'
import { TimeBar } from './hud/TimeBar'
import { FleetList } from './hud/FleetList'
import { MapControls } from './hud/MapControls'
import { BootSequence } from './hud/BootSequence'
import { Placeholder } from './pages/Placeholder'
import { Vessels } from './pages/Vessels'
import { Trips } from './pages/Trips'
import { Alerts } from './pages/Alerts'
import { Buoys } from './pages/Buoys'
import { activityAlerts, buildAlerts } from './sim/alerts'
import { DataHub } from './pages/DataHub'
import { useProfileDrafts } from './data/profileDrafts'
import { useOverrides } from './data/overrides'
import type { Alert } from './data/types'

// 滑過船隻的小卡（V02）
const tooltip = (info: PickingInfo) => {
  const cl = info.object as ActivityCluster | undefined
  if (cl && 'counts' in cl) {
    const e = cl.events[0]
    const when = new Date(e.start).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })
    if (cl.events.length === 1) {
      const what = e.kind === 'encounter' ? (e.encounterType === 'transshipment' ? '運搬船與漁船相遇（疑似海上轉載）' : '加油船與漁船相遇（海上補給）') : e.kind === 'loitering' ? `運搬船徘徊 ${e.hours} 小時` : `AIS 關閉 ${e.hours} 小時`
      return { html: `<b>${ACTIVITY_LABEL[e.kind]}</b><br/>${what}<br/>${when}・船籍 ${(e.flags ?? [e.flag]).join('／') || '—'}<br/><span style="opacity:.6">資料：Global Fishing Watch</span>` }
    }
    const rows = [['transshipment', '疑似海上轉載'], ['bunkering', '海上加油'], ['gap', 'AIS 刻意關閉'], ['loitering', '運搬船徘徊']] as const
    const list = rows.filter(([k]) => cl.counts[k] > 0).map(([k, l]) => `${l} ${cl.counts[k]} 起`).join('<br/>')
    return { html: `<b>此區 ${cl.events.length} 起可疑活動</b><br/>${list}<br/><span style="opacity:.6">拉近可分開檢視・資料：Global Fishing Watch</span>` }
  }
  const port = info.object as Port | undefined
  if (port && 'visits' in port) {
    const flags = port.topFlags.map(([f, n]) => `${f} ${n}`).join('、')
    return { html: `<b>${port.name}</b>（${port.country}）<br/>90 天進港 ${port.visits} 次・${port.vessels} 艘船<br/>漁船 ${port.fishing}・運搬船 ${port.carrier}<br/>主要船籍：${flags || '—'}${port.medianHrs != null ? `<br/>停靠中位數 ${port.medianHrs} 小時` : ''}<br/><span style="opacity:.6">資料：Global Fishing Watch</span>` }
  }
  const d = info.object as FleetItem | undefined
  if (!d || !d.vessel) return null
  return { html: `<b>${d.vessel.name}</b><br/>${STATUS_LABEL[d.status]} · ${d.pose.sog.toFixed(1)} kn · ${d.pose.cog}°` }
}

export default function App() {
  const dirty = useProfileDrafts(s => Object.keys(s.drafts).length > 0)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const [h, setHandles] = useState<MapHandles | null>(null)
  const [feature, setFeature] = useState<Feature | null>(null)
  const ocean = useOcean()
  const fishingSource = useFishingEffort()
  const portsSource = usePorts()
  const eventsSource = useActivity()
  const gfw = fishingSource.state === 'ok' ? fishingSource.data : null
  const portStats = portsSource.state === 'ok' ? portsSource.data : null
  const activityData = eventsSource.state === 'ok' ? eventsSource.data : null
  const activity = useMemo(() => activityData?.events ?? [], [activityData])
  const ports = useMemo(() => portStats?.ports ?? [], [portStats])
  const gfwGear = useStore((s) => s.gfwGear)
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
  useEffect(() => { if (selectedId) setFeature(null) }, [selectedId])
  const onFeature = useCallback((f: Feature) => { selectVessel(null); setFeature(f) }, [selectVessel])
  const now = useStore((s) => s.time.now)

  // 開機序列：依進度逐層點亮（X01）
  const layerFlags = useMemo(
    () => ({ ...rawFlags, buoys: rawFlags.buoys && stage >= 3, others: rawFlags.others && stage >= 4, gfw: rawFlags.gfw && stage >= 3, ports: rawFlags.ports && stage >= 3, activity: rawFlags.activity && stage >= 3, fleet: rawFlags.fleet && stage >= 4, track: rawFlags.track && stage >= 4 }),
    [rawFlags, stage],
  )

  useEffect(() => {
    if (h && grid) mountOceanRasters(h.map, grid)
  }, [h, grid])
  useEffect(() => {
    if (!h || !grid) return
    setRasterVisible(h.map, 'sst', rawFlags.sst && stage >= 1, selectedId ? 0.16 : 0.30)
    setRasterVisible(h.map, 'anomaly', rawFlags.anomaly && stage >= 1, selectedId ? 0.25 : 0.7)
  }, [h, grid, rawFlags.sst, rawFlags.anomaly, stage, selectedId])

  const live = useTicker(500)
  const scrub = useStore((s) => s.scrub)
  const replayOpen = useStore((s) => s.replayOpen)
  // EEZ／PNA：底圖就緒後掛一次，之後只切換顯示
  const [eezReady, setEezReady] = useState(false)
  useEffect(() => {
    if (h && grid) mountEez(h.map).then(() => setEezReady(true)).catch(() => {})
  }, [h, grid])
  useEffect(() => {
    if (h && eezReady) setEezVisible(h.map, rawFlags.eez && stage >= 3)
  }, [h, eezReady, rawFlags.eez, stage])
  // GFW 只在資料、漁具或開關改變時重畫一次（不隨時間或鏡頭重算）
  useEffect(() => {
    if (h && grid) showGfw(h.map, gfw, gfwGear, layerFlags.gfw)
  }, [h, grid, gfw, gfwGear, layerFlags.gfw])
  useEffect(() => {
    if (h?.map.getLayer('pelagos-gfw')) h.map.setPaintProperty('pelagos-gfw', 'raster-opacity', layerFlags.gfw ? selectedId ? 0.2 : 0.65 : 0)
  }, [h, gfw, gfwGear, layerFlags.gfw, selectedId])
  const t = scrub ?? live // 回放時用回放時間（F12）
  const zoom = useMapZoom(h?.map ?? null)
  const snap = useFleetSnapshot(grid, now)
  const fleet = useFleetItems(snap, t)
  const others = useOthers(grid, othersCount, t, layerFlags.others)
  const trackStart = now - 24 * HOUR
  const buoys = useMemo(() => (snap && layerFlags.buoys ? buoyFrame(snap.buoys, trackStart, t) : null), [snap, layerFlags.buoys, trackStart, t])
  const selected = fleet.find((f) => f.vessel.id === selectedId) ?? null
  const selectedEvents = useMemo(() => (snap && selectedId ? snap.events.filter((e) => e.vesselId === selectedId) : []), [snap, selectedId])

  // 手機：抽屜在下方，鏡頭中心往上偏；桌機：面板在右，往左偏
  const camOffset = (): [number, number] => (window.innerWidth <= 640 ? [0, -Math.round(window.innerHeight * 0.2)] : [-190, 0])
  // 選船 → 鏡頭移過去（右側面板 360px，中心往左偏）
  useEffect(() => {
    if (!h || !selectedId) return
    const item = fleet.find((f) => f.vessel.id === selectedId)
    if (item) h.map.easeTo({ center: [item.pose.lon, item.pose.lat], zoom: Math.max(h.map.getZoom(), 5.2), offset: camOffset(), duration: 1200 })
    // 只在選擇改變時移動
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h, selectedId])
  const flyToEvent = (e: TripEvent) => h?.map.flyTo({ center: [e.lon, e.lat], zoom: Math.max(h.map.getZoom(), 6), offset: camOffset(), duration: 1400 })

  // 管理頁點事件 → 回地圖、選船、飛到事件（等選船的鏡頭移動結束）
  const goEvent = (e: TripEvent) => {
    useStore.getState().setView('map')
    selectVessel(e.vesselId)
    setTimeout(() => flyToEvent(e), 1300)
  }
  const fps = useFps()
  const points = (others?.count ?? 0) + (buoys?.n ?? 0) + fleet.length
  const alerts = useMemo(() => (snap ? [...buildAlerts(fleet, snap, t), ...activityAlerts(activity)] : []), [fleet, snap, t, activity])
  const ack = useOverrides((o) => o.ack)
  const imports = useOverrides((o) => o.imports)
  const alertCount = alerts.filter((a) => a.level !== 'info' && !ack[a.id]).length
  const locateAlert = (a: Alert) => {
    useStore.getState().setView('map')
    if (a.vesselId) selectVessel(a.vesselId)
    else if (a.lon !== undefined && a.lat !== undefined) h?.map.flyTo({ center: [a.lon, a.lat], zoom: 6 })
  }
  const goBuoy = (lon: number, lat: number) => {
    setFeature(null)
    const st = useStore.getState()
    st.setView('map')
    st.setLayer('buoys', true)
    st.selectVessel(null)
    h?.map.flyTo({ center: [lon, lat], zoom: 7.5, duration: 1600 })
  }

  const layers = useMemo<Layer[]>(
    () => buildLayers({ layers: layerFlags, zoom, fleet, others, buoys, selectedId, selectedEvents, onSelect: selectVessel, onFeature, trackStart, t, imports, ports, activity }),
    [layerFlags, zoom, fleet, others, buoys, selectedId, selectedEvents, selectVessel, onFeature, trackStart, t, imports, ports, activity],
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
      <div style={{ position: 'absolute', inset: 0, opacity: onMap ? 1 : 0, visibility: onMap ? 'visible' : 'hidden' }}>
        <MapView layers={layers} getTooltip={tooltip} onReady={setHandles} />
      </div>
      {h && grid && <CurrentsCanvas map={h.map} canvas={h.fxCanvas} grid={grid} enabled={rawFlags.currents && stage >= 2 && onMap} maxParticles={fxLow ? 3000 : 6000} />}
      <div style={{ opacity: stage >= 5 ? 1 : 0, transition: 'opacity 0.6s', position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', bottom: 85, left: 'var(--workspace-left)', pointerEvents: 'auto', zIndex: 30 }}>{[['捕魚熱度', fishingSource], ['港口', portsSource], ['活動', eventsSource]].map(([name, source]) => typeof source !== 'string' && source.state === 'error' ? <div key={String(name)} role="alert" style={{ padding: 12, background: '#182d3f', borderRadius: 10 }}>{String(name)}載入失敗 <button onClick={source.retry}>重試 {String(name)}</button></div> : null)}</div>
        <Sidebar alerts={alertCount} />
        {onMap && <MapControls map={h?.map ?? null} onReset={() => setFeature(null)} />}
        <Toolbar key={view} fleet={fleet} layers={<LayerPanel gears={gfw?.gears ?? []} />} info={<InfoPanel grid={grid} />} />
        {onMap && <MapContext grid={grid} gfw={gfw} ports={portStats} activity={activityData} />}
        <Hud selectionKey={feature ? ('name' in feature ? feature.name : feature.events.map(e => e.id).join(',')) : selectedId ?? undefined}
          page={onMap ? undefined : view === 'vessels' ? <Vessels fleet={fleet} now={t} /> : view === 'trips' && snap ? <Trips fleet={fleet} snap={snap} now={t} onEvent={goEvent} />
              : view === 'alerts' ? <Alerts alerts={alerts} onLocate={locateAlert} />
              : view === 'buoys' && snap ? <Buoys snap={snap} fleet={fleet} trackStart={trackStart} now={t} onGo={goBuoy} />
              : view === 'data' ? <DataHub grid={grid} snap={snap} now={t} fleet={fleet} trackStart={trackStart} gfw={gfw} />
              : <Placeholder view={view} />}
          right={
            <AnimatePresence mode="wait">
              {feature ? <FeatureCard key="feature" feature={feature} onClose={() => setFeature(null)} /> : selected && grid ? (
                <VesselCard key={selected.vessel.id} item={selected} events={selectedEvents} grid={grid} onEvent={flyToEvent} />
              ) : snap ? (
                <div key="overview" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)', minHeight: 0, flex: 1 }}>
                  <KpiWall fleet={fleet} snap={snap} alerts={alertCount} now={t} />
                  <FleetList fleet={fleet} />
                </div>
              ) : null}
            </AnimatePresence>
          }
          bottom={replayOpen || scrub !== null ? <TimeBar live={live} /> : undefined}
          bottomLeft={demoMode ? <PerfHud points={points} fps={fps} /> : undefined}
        />
      </div>
      {intro !== 'done' && <BootSequence map={h?.map ?? null} steps={bootSteps} onDone={introDone} error={ocean.state === 'error' ? ocean.error : undefined} onRetry={ocean.retry} />}
    </>
  )
}
