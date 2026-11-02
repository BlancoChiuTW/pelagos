// KPI 牆（F08）：管理層一眼看全局。數字變動用 AnimatedNumber 跳動（X07）
import type { FleetSnapshot, VesselStatus } from '../data/types'
import type { FleetItem } from '../data/useFleet'
import { STATUS_LABEL } from '../sim/status'
import { AnimatedNumber } from './AnimatedNumber'
import { Panel } from './Panel'
import s from './KpiWall.module.css'

const ORDER: VesselStatus[] = ['fishing', 'transit', 'drifting', 'in_port', 'signal_lost']
const VAR: Record<VesselStatus, string> = { fishing: 'var(--ok)', transit: 'var(--accent)', drifting: 'var(--text-dim)', in_port: 'var(--text)', signal_lost: 'var(--alert)' }

export function KpiWall({ fleet, snap, alerts, now }: { fleet: FleetItem[]; snap: FleetSnapshot; alerts: number; now: number }) {
  const count = Object.fromEntries(ORDER.map((k) => [k, 0])) as Record<VesselStatus, number>
  for (const f of fleet) count[f.status]++
  const atSea = fleet.length - count.in_port
  // 本月（台北時間）下網漁獲
  const d = new Date(now + 8 * 3_600_000)
  const monthStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - 8 * 3_600_000
  let monthTons = 0
  for (const e of snap.events) if (e.type === 'set' && e.at >= monthStart && e.at <= now) monthTons += e.detail.catchTons ?? 0
  const buoys = snap.buoys.length

  return (
    <Panel title="船隊總覽">
      <div className={s.grid}>
        <div><div className={s.k}>在海船數</div><div className={s.v}><AnimatedNumber value={atSea} /><small>/ {fleet.length}</small></div></div>
        <div><div className={s.k}>本月漁獲</div><div className={s.v}><AnimatedNumber value={monthTons} /><small>噸</small></div></div>
        <div><div className={s.k}>警示</div><div className={s.v} style={{ color: alerts ? 'var(--alert)' : undefined }}><AnimatedNumber value={alerts} /></div></div>
        <div><div className={s.k}>作業中</div><div className={s.v} style={{ color: 'var(--ok)' }}><AnimatedNumber value={count.fishing} /></div></div>
        <div><div className={s.k}>航行中</div><div className={s.v} style={{ color: 'var(--accent)' }}><AnimatedNumber value={count.transit} /></div></div>
        <div><div className={s.k}>啟用浮標</div><div className={s.v}><AnimatedNumber value={buoys} /></div></div>
      </div>
      <div className={s.bar}>
        {ORDER.map((k) => <div key={k} style={{ flexGrow: count[k], background: VAR[k] }} />)}
      </div>
      <div className={s.legend}>
        {ORDER.map((k) => <span key={k}><i style={{ background: VAR[k] }} />{STATUS_LABEL[k]} {count[k]}</span>)}
      </div>
    </Panel>
  )
}
