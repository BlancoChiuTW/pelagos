// 船舶管理（M01）：表格（搜尋／篩選／排序）＋船舶主檔（可編輯、存 IndexedDB）＋到地圖定位
import { useMemo, useState } from 'react'
import { fmtLat, fmtLon } from '../data/grid'
import { useProfileDrafts } from '../data/profileDrafts'
import { useOverrides } from '../data/overrides'
import type { FleetItem } from '../data/useFleet'
import { VESSEL_TYPE_LABEL } from '../sim/labels'
import { defaultProfile, PROFILE_FIELDS, type VesselProfile } from '../sim/profile'
import { STATUS_LABEL } from '../sim/status'
import { useStore } from '../store'
import { Panel } from '../hud/Panel'
import { ago, STATUS_VAR } from './common'
import s from './Page.module.css'

type Filter = 'all' | 'purse_seiner' | 'reefer' | 'issue'
type Col = 'name' | 'status' | 'days' | 'catch' | 'fuel' | 'last'

export function Vessels({ fleet, now }: { fleet: FleetItem[]; now: number }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<{ col: Col; dir: 1 | -1 }>({ col: 'name', dir: 1 })
  const selected = useStore((st) => st.selectedVesselId)
  const setSel = useStore((st) => st.selectVessel)
  const sel = selected ?? fleet[0]?.vessel.id ?? null
  const rows = useMemo(() => {
    const key = (f: FleetItem): string | number =>
      ({ name: f.vessel.name, status: f.status, days: f.trip.summary.days, catch: f.trip.summary.catchTons, fuel: f.trip.summary.fuelPct, last: f.track.at(-1)?.at ?? 0 })[sort.col]
    return fleet
      .filter((f) => !q || f.vessel.name.includes(q) || f.vessel.id.toLowerCase().includes(q.toLowerCase()))
      .filter((f) => (filter === 'all' ? true : filter === 'issue' ? f.status === 'signal_lost' || f.trip.summary.fuelPct < 20 : f.vessel.type === filter))
      .sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0) * sort.dir)
  }, [fleet, q, filter, sort])
  const th = (col: Col, label: string) => (
    <th aria-sort={sort.col === col ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => setSort((p) => ({ col, dir: p.col === col ? ((-p.dir) as 1 | -1) : 1 }))}>{label}{sort.col === col ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</button>
    </th>
  )
  const item = fleet.find((f) => f.vessel.id === sel) ?? null
  return (
    <div className={s.page}>
      <Panel className={s.main}>
        <div className={s.head}>
          <div><h1 className={s.h1}>船舶管理</h1><div className={s.sub}>藍潮漁業 · {fleet.length} 艘 · 點選一列檢視與編輯主檔</div></div>
          <div className={s.grow} />
          <div className={s.seg}>
            {([['all', '全部'], ['purse_seiner', '圍網船'], ['reefer', '運搬船'], ['issue', '需注意']] as [Filter, string][]).map(([k, l]) => (
              <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <input className={s.search} aria-label="篩選船舶表格" placeholder="搜尋船名或編號" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className={s.scroll}>
          <table className={`${s.table} ${s.vesselTable}`}>
            <thead><tr>{th('name', '船名')}<th>類型</th>{th('status', '狀態')}<th>位置</th>{th('days', '航次天數')}{th('catch', '艙內漁獲')}{th('fuel', '油料')}{th('last', '最後回報')}</tr></thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.vessel.id} aria-selected={f.vessel.id === sel} onClick={() => setSel(f.vessel.id)}>
                  <td><button className={s.rowButton} onClick={() => setSel(f.vessel.id)} aria-label={`編輯 ${f.vessel.name}`}><b>{f.vessel.name}</b><span className={s.dim}>{f.vessel.id}</span></button></td>
                  <td className={s.dim}>{VESSEL_TYPE_LABEL[f.vessel.type]}</td>
                  <td><span className={s.chip} style={{ color: STATUS_VAR[f.status] }}>{STATUS_LABEL[f.status]}</span></td>
                  <td className={s.dim}>{fmtLat(f.pose.lat, 1)} {fmtLon(f.pose.lon, 1)}</td>
                  <td>{f.trip.summary.days} 天</td>
                  <td>{f.trip.summary.catchTons} 噸</td>
                  <td><span className={s.bar}><i style={{ width: `${f.trip.summary.fuelPct}%`, background: f.trip.summary.fuelPct < 20 ? 'var(--red)' : f.trip.summary.fuelPct < 40 ? 'var(--orange)' : 'var(--tint)' }} /></span>{f.trip.summary.fuelPct}%</td>
                  <td className={s.dim}>{f.track.at(-1) ? ago(f.track.at(-1)!.at, now) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className={s.empty}>沒有符合條件的船舶<div className={s.actions} style={{ justifyContent: 'center' }}><button className={s.btn} onClick={() => { setQ(''); setFilter('all') }}>清除篩選</button></div></div>}
        </div>
        <div className={s.footer}><span>顯示 {rows.length} / {fleet.length} 艘船舶</span><span>主檔變更儲存於此瀏覽器</span></div>
      </Panel>
      <Panel className={s.side}>{item ? <ProfileEditor key={item.vessel.id} item={item} /> : <div className={s.empty}>選一艘船</div>}</Panel>
    </div>
  )
}

function ProfileEditor({ item }: { item: FleetItem }) {
  const saved = useOverrides((o) => o.profiles[item.vessel.id])
  const save = useOverrides((o) => o.saveProfile)
  const setView = useStore((st) => st.setView)
  const select = useStore((st) => st.selectVessel)
  const base = defaultProfile(item.vessel)
  const pending = useProfileDrafts(s => s.drafts[item.vessel.id])
  const draft = pending ?? { ...base, ...saved }
  const setDraft = (v: VesselProfile) => useProfileDrafts.getState().put(item.vessel.id, v)
  const clear = () => useProfileDrafts.getState().clear(item.vessel.id)
  const [ok, setOk] = useState(false)
  return (
    <div>
      <div className={s.section}>{item.vessel.name}</div>
      <div className={s.sub} style={{ marginBottom: 12 }}>{VESSEL_TYPE_LABEL[item.vessel.type]} · {item.vessel.fleet} · 船籍 {item.vessel.flag}{saved ? ' · 已編輯' : ''}</div>
      {pending && <p role="status" className={s.sub}>尚未儲存 · 切換模組會保留草稿（重新整理前請儲存） <button className={s.btn} onClick={clear}>捨棄草稿</button></p>}
      <div className={s.form}>
        {PROFILE_FIELDS.map((f) => (
          <label key={f.key} className={`${s.field} ${f.key === 'satPhone' ? s.full : ''}`}>
            {f.label}
            <input type={f.type} value={draft[f.key]} onChange={(e) => { setOk(false); setDraft({ ...draft, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }) }} />
          </label>
        ))}
      </div>
      <div className={s.actions}>
        <button className={`${s.btn} ${s.primary}`} onClick={() => { save(item.vessel.id, draft); clear(); setOk(true) }}>儲存</button>
        <button className={s.btn} onClick={() => { setView('map'); select(item.vessel.id) }}>在地圖上檢視</button>
        {ok && <span className={s.toast} role="status">已儲存至此瀏覽器</span>}
      </div>
      <div className={s.section}>本航次</div>
      <dl className={s.kv}>
        <dt>出港</dt><dd>{new Date(item.trip.departedAt).toLocaleDateString('zh-TW')} {item.trip.departPort}</dd>
        <dt>天數</dt><dd>{item.trip.summary.days} 天</dd>
        {item.vessel.type === 'purse_seiner' && <><dt>下網</dt><dd>{item.trip.summary.sets} 網</dd><dt>浮標</dt><dd>{item.trip.summary.activeBuoys} / 350</dd></>}
        <dt>艙內漁獲</dt><dd>{item.trip.summary.catchTons} 噸</dd>
        {item.trip.plan && <><dt>目的地</dt><dd>{item.trip.plan.name}</dd></>}
      </dl>
    </div>
  )
}
