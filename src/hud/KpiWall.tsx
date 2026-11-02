import type { FleetSnapshot, VesselStatus } from '../data/types'
import type { FleetItem } from '../data/useFleet'
import { STATUS_LABEL } from '../sim/status'
import { useStore } from '../store'
import { AnimatedNumber } from './AnimatedNumber'
import { Panel } from './Panel'
import s from './KpiWall.module.css'

const ORDER: VesselStatus[] = ['fishing', 'transit', 'drifting', 'in_port', 'signal_lost']
const VAR: Record<VesselStatus, string> = { fishing: 'var(--ok)', transit: 'var(--accent)', drifting: 'var(--text-dim)', in_port: 'var(--text)', signal_lost: 'var(--alert)' }

export function KpiWall({ fleet, snap, alerts, now }: { fleet: FleetItem[]; snap: FleetSnapshot; alerts: number; now: number }) {
  const setView = useStore((st) => st.setView)
  const count = Object.fromEntries(ORDER.map((k) => [k, 0])) as Record<VesselStatus, number>
  for (const f of fleet) count[f.status]++
  const atSea = fleet.length - count.in_port
  const d = new Date(now + 8 * 3_600_000)
  const monthStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - 8 * 3_600_000
  let monthTons = 0
  for (const e of snap.events) if (e.type === 'set' && e.at >= monthStart && e.at <= now) monthTons += e.detail.catchTons ?? 0

  return (
    <Panel>
      <div className={s.head}><span>船隊概況</span><span className={s.caption}>模擬營運資料</span></div>
      <div className={s.hero}>
        <div><div className={s.k}>在海船舶</div><div className={s.total}><AnimatedNumber value={atSea} /><small>/ {fleet.length} 艘</small></div></div>
        <button className={s.alert} onClick={() => setView('alerts')}><span className={s.k}>待關注警示 ↗</span><strong>{alerts}</strong></button>
      </div>
      <div className={s.bar} aria-label="船隊狀態分布">
        {ORDER.map((k) => <div key={k} title={STATUS_LABEL[k] + ' ' + count[k]} style={{ flexGrow: count[k], background: VAR[k] }} />)}
      </div>
      <div className={s.legend}>{ORDER.filter((k) => count[k] > 0).map((k) => <span key={k}><i style={{ background: VAR[k] }} />{STATUS_LABEL[k]} {count[k]}</span>)}</div>
      <div className={s.metrics}>
        <button onClick={() => setView('trips')}><span className={s.k}>本月漁獲 ↗</span><b><AnimatedNumber value={monthTons} /><small>噸</small></b></button>
        <button onClick={() => setView('buoys')}><span className={s.k}>啟用浮標 ↗</span><b><AnimatedNumber value={snap.buoys.length} /><small>個</small></b></button>
      </div>
    </Panel>
  )
}
