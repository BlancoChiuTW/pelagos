import { useStore, type LayerKey } from '../store'
import type { ActivityEvents, FishingEffort, OceanGrid, PortStats } from '../data/types'
import s from './MapContext.module.css'

const presets: [string, LayerKey[]][] = [
  ['船隊', ['fleet', 'track', 'sst']],
  ['海況', ['fleet', 'sst', 'currents', 'eez']],
  ['周邊活動', ['fleet', 'gfw', 'ports', 'activity', 'eez']],
]
export function MapContext({ grid, gfw, ports, activity }: { grid: OceanGrid | null; gfw: FishingEffort | null; ports: PortStats | null; activity: ActivityEvents | null }) {
  const flags = useStore(s => s.layers)
  const scrub = useStore(s => s.scrub)
  const replayOpen = useStore(s => s.replayOpen)
  const selected = useStore(s => s.selectedVesselId)
  const dates: string[] = []
  if (flags.sst) dates.push(`海溫 ${grid?.meta.sst.time.slice(0, 10) ?? '載入中'}`)
  if (flags.anomaly) dates.push(`異常 ${grid?.meta.anom.time.slice(0, 10) ?? '載入中'}`)
  if (flags.currents) dates.push(`洋流 ${grid?.meta.u.time.slice(0, 10) ?? '載入中'}`)
  for (const [key, name, data] of [['gfw', '捕魚熱度', gfw], ['ports', '港口', ports], ['activity', '活動', activity]] as const) {
    if (flags[key]) dates.push(`${name} ${data?.dateRange.map(d => d.slice(0, 10)).join(' ～ ') ?? '尚未就緒'}`)
  }
  if (flags.eez) dates.push('EEZ：靜態邊界，非歷史回放')
  return <section className={s.context} aria-label="地圖視角與資料期間">
    <div className={s.presets}>{presets.map(([name, keys]) => <button key={name} aria-pressed={Object.entries(flags).every(([k, v]) => v === keys.includes(k as LayerKey))} onClick={() => useStore.setState({ layers: Object.fromEntries(Object.keys(flags).map(k => [k, keys.includes(k as LayerKey)])) as typeof flags })}>{name}</button>)}</div>
    <details className={s.periods}><summary>圖層資料期間{selected ? ' · 已淡化周邊標記' : ''}</summary>{dates.map(d => <div key={d}>{d}</div>)}<div>船隊／浮標：模擬資料</div></details>
    {(replayOpen || scrub !== null) && <div className={s.notice} role="status">僅船隊／浮標回放，背景資料期間固定</div>}
  </section>
}
