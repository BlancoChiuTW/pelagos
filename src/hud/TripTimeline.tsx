// 航次時間軸（F07）＝這艘船這一趟的「病程」：新到舊列出事件，點事件 → 地圖飛到事件位置
import { motion } from 'motion/react'
import type { TripEvent } from '../data/types'
import { EVENT_LABEL, EVENT_VAR, fmtTime } from '../sim/labels'
import s from './TripTimeline.module.css'

function detail(e: TripEvent): string {
  const d = e.detail
  const parts: string[] = []
  if (d.catchTons !== undefined) parts.push(e.type === 'set' ? `漁獲 ${d.catchTons} 噸` : `${d.catchTons} 噸`)
  if (d.port) parts.push(d.port)
  if (d.counterpart) parts.push(`對象 ${d.counterpart}`)
  if (d.note) parts.push(d.note)
  return parts.join(' · ')
}

export function TripTimeline({ events, onEvent }: { events: TripEvent[]; onEvent: (e: TripEvent) => void }) {
  const list = [...events].reverse()
  return (
    <div className={s.wrap}>
      <div className={s.title}><span>航次時間軸</span><em>TRIP LOG · {events.length}</em></div>
      <motion.ul className={s.list} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.025 } } }}>
        {list.map((e) => (
          <motion.li key={e.id} className={s.row} onClick={() => onEvent(e)}
            variants={{ hidden: { opacity: 0, x: 8 }, show: { opacity: 1, x: 0 } }}>
            <span className={s.time}>{fmtTime(e.at)}</span>
            <span className={s.dot} style={{ color: EVENT_VAR[e.type] }} />
            <span>
              <div className={s.label}>{EVENT_LABEL[e.type]}</div>
              {detail(e) && <div className={s.detail}>{detail(e)}</div>}
            </span>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  )
}
