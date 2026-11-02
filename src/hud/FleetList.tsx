// 戰情頁的船隊小清單：不用開船舶大表就能找船，點一下＝選中並飛過去
import { useState } from 'react'
import type { FleetItem } from '../data/useFleet'
import { STATUS_LABEL } from '../sim/status'
import { STATUS_VAR } from '../pages/common'
import { useStore } from '../store'
import { Panel } from './Panel'
import s from './FleetList.module.css'

type F = 'all' | 'fishing' | 'move' | 'issue'
const FILTERS: [F, string][] = [['all', '全部'], ['fishing', '作業'], ['move', '航行'], ['issue', '需注意']]
const ORDER = { signal_lost: 0, fishing: 1, transit: 2, drifting: 3, in_port: 4 } as const

export function FleetList({ fleet }: { fleet: FleetItem[] }) {
  const [f, setF] = useState<F>('all')
  const select = useStore((st) => st.selectVessel)
  const rows = fleet
    .filter((x) => f === 'all' || (f === 'fishing' && x.status === 'fishing') || (f === 'move' && x.status === 'transit') || (f === 'issue' && (x.status === 'signal_lost' || x.trip.summary.fuelPct < 20)))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.vessel.name.localeCompare(b.vessel.name))
  return (
    <Panel className={s.panel}>
      <div className={s.head}>
        <span className={s.title}>我的船隊 <span style={{ font: 'var(--t-footnote)', color: 'var(--label-2)' }}>{rows.length} 艘</span></span>
        <div className={s.seg}>{FILTERS.map(([k, l]) => <button key={k} aria-pressed={f === k} onClick={() => setF(k)}>{l}</button>)}</div>
      </div>
      <div className={s.list}>
        {rows.map((x) => (
          <button key={x.vessel.id} className={s.row} onClick={() => select(x.vessel.id)}>
            <span className={s.dot} style={{ background: STATUS_VAR[x.status] }} />
            <span className={s.name}>{x.vessel.name}<small>{x.vessel.type === 'reefer' ? '冷凍運搬船' : '鮪魚圍網船'} · {x.vessel.id}</small></span>
            <span className={s.st} style={{ color: x.trip.summary.fuelPct < 20 ? 'var(--orange)' : STATUS_VAR[x.status] }}>{x.trip.summary.fuelPct < 20 && x.status !== 'signal_lost' ? '油料低' : STATUS_LABEL[x.status]}<span className={s.sog}>{x.status === 'signal_lost' ? '回報中斷' : `${x.pose.sog.toFixed(1)} kn`}</span></span>
          </button>
        ))}
        {!rows.length && <div className={s.empty}>目前沒有符合的船舶<button onClick={() => setF('all')}>顯示全部船隊</button></div>}
      </div>
    </Panel>
  )
}
