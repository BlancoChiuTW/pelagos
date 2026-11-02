// 航次管理（M02）：航次清單＋病程（每日漁獲圖、時間軸）＋手動新增事件（存 IndexedDB，地圖即時出現）
import { useMemo, useState } from 'react'
import { normLon } from '../data/grid'
import { useOverrides } from '../data/overrides'
import type { EventType, FleetSnapshot, TripEvent } from '../data/types'
import type { FleetItem } from '../data/useFleet'
import { DAY } from '../sim/geo'
import { EVENT_LABEL, fmtDate, VESSEL_TYPE_LABEL } from '../sim/labels'
import { STATUS_LABEL } from '../sim/status'
import { Panel } from '../hud/Panel'
import { TripTimeline } from '../hud/TripTimeline'
import { STATUS_VAR } from './common'
import s from './Page.module.css'

const ADDABLE: EventType[] = ['set', 'deploy_buoy', 'transship', 'port_call', 'bunker']
const TPE = 8 * 3_600_000

function DailyCatch({ events, now }: { events: TripEvent[]; now: number }) {
  const days = 30
  const start = Math.floor((now + TPE) / DAY) * DAY - TPE - (days - 1) * DAY
  const tons = new Array(days).fill(0)
  for (const e of events) if (e.type === 'set' && e.at >= start) tons[Math.min(days - 1, Math.floor((e.at - start) / DAY))] += e.detail.catchTons ?? 0
  const max = Math.max(60, ...tons)
  const W = 340, H = 90, bw = W / days
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 16}`} role="img" aria-label="近 30 天每日漁獲">
      {tons.map((v, i) => (
        <rect key={i} x={i * bw + 1} y={H - (v / max) * H} width={bw - 2} height={Math.max(v ? 2 : 0, (v / max) * H)} rx={2} fill={i === days - 1 ? 'var(--tint)' : 'rgba(100,210,255,.45)'}>
          <title>{`${fmtDate(start + i * DAY)}：${v.toFixed(1)} 噸`}</title>
        </rect>
      ))}
      <line x1="0" x2={W} y1={H} y2={H} stroke="var(--sep)" />
      <text x="0" y={H + 13} fill="var(--label-2)" fontSize="10">30 天前</text>
      <text x={W} y={H + 13} fill="var(--label-2)" fontSize="10" textAnchor="end">今天</text>
    </svg>
  )
}

function AddEvent({ item, now }: { item: FleetItem; now: number }) {
  const add = useOverrides((o) => o.addEvent)
  const local = new Date(now + TPE).toISOString().slice(0, 16)
  const [f, setF] = useState({ type: 'set' as EventType, at: local, lat: item.pose.lat.toFixed(3), lon: item.pose.lon.toFixed(3), tons: '30', port: '', counterpart: '', note: '' })
  const [ok, setOk] = useState(false)
  const up = (k: keyof typeof f, v: string) => { setOk(false); setF({ ...f, [k]: v }) }
  const submit = () => {
    const at = Date.parse(`${f.at}:00Z`) - TPE
    const lat = Number(f.lat), lon = normLon(Number(f.lon))
    if (!Number.isFinite(at) || !Number.isFinite(lat) || !Number.isFinite(lon)) return
    add({
      id: `U${Date.now()}`, tripId: item.trip.id, vesselId: item.vessel.id, at, type: f.type, lon, lat,
      detail: { catchTons: f.type === 'set' || f.type === 'transship' ? Number(f.tons) || 0 : undefined, port: f.port || undefined, counterpart: f.counterpart || undefined, note: f.note ? `${f.note}（手動登錄）` : '手動登錄' },
    })
    setOk(true)
  }
  return (
    <div>
      <div className={s.form}>
        <label className={s.field}>事件類型<select value={f.type} onChange={(e) => up('type', e.target.value)}>{ADDABLE.map((t) => <option key={t} value={t}>{EVENT_LABEL[t]}</option>)}</select></label>
        <label className={s.field}>時間（台北）<input type="datetime-local" value={f.at} onChange={(e) => up('at', e.target.value)} /></label>
        <label className={s.field}>緯度<input value={f.lat} onChange={(e) => up('lat', e.target.value)} /></label>
        <label className={s.field}>經度（0–360）<input value={f.lon} onChange={(e) => up('lon', e.target.value)} /></label>
        {(f.type === 'set' || f.type === 'transship') && <label className={s.field}>漁獲（噸）<input type="number" value={f.tons} onChange={(e) => up('tons', e.target.value)} /></label>}
        {(f.type === 'transship' || f.type === 'port_call' || f.type === 'bunker') && <label className={s.field}>港口<input value={f.port} onChange={(e) => up('port', e.target.value)} placeholder="例：Majuro" /></label>}
        {f.type === 'transship' && <label className={s.field}>對象船<input value={f.counterpart} onChange={(e) => up('counterpart', e.target.value)} placeholder="例：藍潮運 3" /></label>}
        <label className={`${s.field} ${s.full}`}>備註<input value={f.note} onChange={(e) => up('note', e.target.value)} /></label>
      </div>
      <div className={s.actions}>
        <button className={`${s.btn} ${s.primary}`} onClick={submit}>新增事件</button>
        {ok && <span className={s.toast}>已新增，地圖與時間軸已更新</span>}
      </div>
    </div>
  )
}

export function Trips({ fleet, snap, now, onEvent }: { fleet: FleetItem[]; snap: FleetSnapshot; now: number; onEvent: (e: TripEvent) => void }) {
  const [sel, setSel] = useState<string | null>(fleet[0]?.vessel.id ?? null)
  const item = fleet.find((f) => f.vessel.id === sel) ?? null
  const events = useMemo(() => (item ? snap.events.filter((e) => e.tripId === item.trip.id) : []), [snap, item])
  return (
    <div className={s.page}>
      <Panel className={s.main}>
        <div className={s.head}><div><h1 className={s.h1}>航次管理</h1><div className={s.sub}>每趟航次＝一段「病程」：事件依時間記錄，可手動補登</div></div></div>
        <div className={s.scroll}>
          <table className={s.table}>
            <thead><tr><th>船名</th><th>出港</th><th>天數</th><th>狀態</th><th>下網</th><th>艙內漁獲</th><th>事件數</th></tr></thead>
            <tbody>
              {fleet.map((f) => (
                <tr key={f.trip.id} aria-selected={f.vessel.id === sel} onClick={() => setSel(f.vessel.id)}>
                  <td><b>{f.vessel.name}</b> <span className={s.dim}>{VESSEL_TYPE_LABEL[f.vessel.type]}</span></td>
                  <td className={s.dim}>{fmtDate(f.trip.departedAt)} {f.trip.departPort}</td>
                  <td>{f.trip.summary.days} 天</td>
                  <td><span className={s.chip} style={{ color: STATUS_VAR[f.status] }}>{STATUS_LABEL[f.status]}</span></td>
                  <td>{f.vessel.type === 'purse_seiner' ? `${f.trip.summary.sets} 網` : '—'}</td>
                  <td>{f.trip.summary.catchTons} 噸</td>
                  <td className={s.dim}>{snap.events.filter((e) => e.tripId === f.trip.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel className={s.side} style={{ display: 'flex', flexDirection: 'column' }}>
        {item ? (
          <>
            <div className={s.section}>{item.vessel.name} · 本航次</div>
            {item.vessel.type === 'purse_seiner' && <><div className={s.sub} style={{ marginBottom: 6 }}>近 30 天每日漁獲（噸）</div><DailyCatch events={events} now={now} /></>}
            <div className={s.section}>新增事件</div>
            <AddEvent key={item.vessel.id} item={item} now={now} />
            <div className={s.section} />
            <div style={{ flex: 1, minHeight: 260, display: 'flex' }}><TripTimeline events={events} onEvent={onEvent} /></div>
          </>
        ) : <div className={s.empty}>選一趟航次</div>}
      </Panel>
    </div>
  )
}
