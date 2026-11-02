// 船隻詳情卡（F06）：船況＋所在海況＋航次摘要；下方接航次時間軸（F07）
import { motion } from 'motion/react'
import { fmtLat, fmtLon, sample } from '../data/grid'
import type { OceanGrid, TripEvent } from '../data/types'
import type { FleetItem } from '../data/useFleet'
import { STATUS_LABEL } from '../sim/status'
import { fmtDate, VESSEL_TYPE_LABEL } from '../sim/labels'
import { useStore } from '../store'
import { Panel } from './Panel'
import { TripTimeline } from './TripTimeline'
import { Icon } from './icons'
import s from './VesselCard.module.css'

const STATUS_VAR = { fishing: 'var(--ok)', transit: 'var(--accent)', drifting: 'var(--text-dim)', in_port: 'var(--text)', signal_lost: 'var(--alert)' } as const

interface Props { item: FleetItem; events: TripEvent[]; grid: OceanGrid; onEvent: (e: TripEvent) => void }

export function VesselCard({ item, events, grid, onEvent }: Props) {
  const select = useStore((st) => st.selectVessel)
  const { vessel, trip, pose, status } = item
  const sst = sample(grid, grid.sst, pose.lon, pose.lat)
  const u = sample(grid, grid.u, pose.lon, pose.lat)
  const v = sample(grid, grid.v, pose.lon, pose.lat)
  const fuel = trip.summary.fuelPct
  const fuelVar = fuel < 20 ? 'var(--alert)' : fuel < 40 ? 'var(--warn)' : 'var(--accent)'
  const val = (x: number, d: number, unit: string) => (Number.isNaN(x) ? '—' : <>{x.toFixed(d)}<small>{unit}</small></>)

  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.2 }} style={{ height: '100%', display: 'flex' }}>
      <Panel className={s.card} style={{ flex: 1 }}>
        <button className={s.back} onClick={() => select(null)}>← 返回船隊總覽</button>
        <div className={s.head}>
          <div>
            <div className={s.name}>{vessel.name}</div>
            <div className={s.meta}>{VESSEL_TYPE_LABEL[vessel.type]} · {vessel.flag} · {vessel.id}</div>
          </div>
          <span className={s.chip} style={{ color: STATUS_VAR[status] }}>{STATUS_LABEL[status]}</span>
          <button className={s.close} onClick={() => select(null)} aria-label="關閉">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </div>
        <div className={s.grid}>
          <div><div className={s.k}>位置</div><div className={s.v} style={{ fontSize: 12 }}>{fmtLat(pose.lat)} {fmtLon(pose.lon)}</div></div>
          <div><div className={s.k}>航速／航向 SOG/COG</div><div className={s.v}>{pose.sog.toFixed(1)}<small>kn</small> {pose.cog}<small>°</small></div></div>
          <div><div className={s.k}>所在海溫 SST</div><div className={s.v}>{val(sst, 1, '°C')}</div></div>
          <div><div className={s.k}>流速 CURRENT</div><div className={s.v}>{val(Math.hypot(u, v), 2, 'm/s')}</div></div>
        </div>
        <div className={s.sep} />
        <div className={s.grid}>
          <div><div className={s.k}>出港</div><div className={s.v} style={{ fontSize: 12 }}>{fmtDate(trip.departedAt)} {trip.departPort}</div></div>
          <div><div className={s.k}>航次天數</div><div className={s.v}>{trip.summary.days}<small>天</small></div></div>
          {vessel.type === 'purse_seiner' ? (
            <>
              <div><div className={s.k}>下網次數</div><div className={s.v}>{trip.summary.sets}<small>網</small></div></div>
              <div><div className={s.k}>艙內漁獲</div><div className={s.v}>{trip.summary.catchTons}<small>噸</small></div></div>
              <div><div className={s.k}>啟用浮標 FAD</div><div className={s.v}>{trip.summary.activeBuoys}<small>/ 350</small></div></div>
            </>
          ) : (
            <div><div className={s.k}>載貨量</div><div className={s.v}>{trip.summary.catchTons}<small>噸</small></div></div>
          )}
          <div>
            <div className={s.k}>油料 FUEL</div>
            <div className={s.v}>{fuel}<small>%</small></div>
            <div className={s.fuel}><div style={{ width: `${fuel}%`, background: fuelVar }} /></div>
          </div>
        </div>
        <div className={s.actions}>
          <button className={s.primary} onClick={() => useStore.getState().setView('trips')}>{Icon.route}查看航次</button>
          <button onClick={() => useStore.getState().setView('vessels')}>船舶主檔 ↗</button>
        </div>
        <button className={s.replay} onClick={() => { const st = useStore.getState(); st.setReplayOpen(true); st.setScrub(st.time.now - 24 * 3_600_000); st.play() }}>{Icon.replay}回放過去 24 小時航跡</button>
        <div className={s.sep} />
        <TripTimeline events={events} onEvent={onEvent} />
      </Panel>
    </motion.div>
  )
}
