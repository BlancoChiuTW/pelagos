// 警示中心（M04）：未處理／全部、標記已處理（存 IndexedDB）、到地圖查看
import { useState } from 'react'
import { useOverrides } from '../data/overrides'
import type { Alert } from '../data/types'
import { fmtTime } from '../sim/labels'
import { Panel } from '../hud/Panel'
import s from './Page.module.css'

const LEVEL = { alert: ['緊急', 'var(--red)'], warn: ['注意', 'var(--orange)'], info: ['通知', 'var(--tint)'] } as const

export function Alerts({ alerts, onLocate }: { alerts: Alert[]; onLocate: (a: Alert) => void }) {
  const ack = useOverrides((o) => o.ack)
  const setAck = useOverrides((o) => o.setAck)
  const [all, setAll] = useState(false)
  const rows = all ? alerts : alerts.filter((a) => !ack[a.id])
  const open = alerts.filter((a) => !ack[a.id]).length
  return (
    <Panel style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className={s.head}>
        <div><h1 className={s.h1}>警示中心</h1><div className={s.sub}>{open} 則未處理 · 規則：訊號中斷、油料、入漁天數、FAD 禁用期、轉載</div></div>
        <div className={s.grow} />
        <div className={s.seg}><button aria-pressed={!all} onClick={() => setAll(false)}>未處理</button><button aria-pressed={all} onClick={() => setAll(true)}>全部</button></div>
      </div>
      <div className={s.scroll}>
        <table className={s.table}>
          <thead><tr><th>等級</th><th>內容</th><th>時間</th><th /></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} style={{ opacity: ack[a.id] ? 0.5 : 1, cursor: 'default' }}>
                <td><span className={s.chip} style={{ color: LEVEL[a.level][1] }}>{LEVEL[a.level][0]}</span></td>
                <td style={{ whiteSpace: 'normal' }}><b>{a.title}</b><div className={s.dim}>{a.body}</div></td>
                <td className={s.dim}>{fmtTime(a.at)}</td>
                <td style={{ textAlign: 'right' }}>
                  {a.lon !== undefined && <button className={s.btn} onClick={() => onLocate(a)}>地圖查看</button>}{' '}
                  <button className={s.btn} onClick={() => setAck(a.id, !ack[a.id])}>{ack[a.id] ? '取消處理' : '標記已處理'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className={s.empty}>沒有未處理的警示</div>}
      </div>
    </Panel>
  )
}
