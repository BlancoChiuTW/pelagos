// 資料串接（M03）：連線清單（像 HIS 的介面引擎）＋檔案匯入（預覽 → 欄位對應 → 上地圖）
import { useState } from 'react'
import { encodeFlux, encodeNaf, encodeVendorA, encodeVendorB, parseBuoy, parseFlux, parseNaf } from '../data/interfaces/formats'
import type { FleetItem } from '../data/useFleet'
import { buoyFrame } from '../layers/buoys'
import { defaultProfile } from '../sim/profile'
import { InterfaceConsole, useFeed } from './InterfaceConsole'
import { dataUrl } from '../data/DataSource'
import { guessMapping, parseCsv, parseGeoJson, type Table } from '../data/importer'
import { normLon } from '../data/grid'
import { useOverrides } from '../data/overrides'
import type { FleetSnapshot, OceanGrid } from '../data/types'
import { fmtTime } from '../sim/labels'
import { useStore } from '../store'
import { Panel } from '../hud/Panel'
import s from './Page.module.css'

type Map4 = { lon: number; lat: number; label: number; value: number }
const day = (iso?: string) => (iso ? iso.slice(0, 10) : '—')

type Key = 'noaa' | 'vms' | 'fad' | 'elog'
function Connector({ name, kind, status, rows, active, onClick }: { name: string; kind: string; status: [string, string]; rows: [string, string][]; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ padding: 14, borderRadius: 12, cursor: 'pointer', background: active ? 'rgba(100,210,255,.10)' : 'rgba(255,255,255,.04)', border: `0.5px solid ${active ? 'var(--tint)' : 'var(--sep)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <b style={{ font: 'var(--t-headline)' }}>{name}</b>
        <span className={s.chip} style={{ color: status[1], marginLeft: 'auto' }}>{status[0]}</span>
      </div>
      <div className={s.dim} style={{ marginBottom: 8 }}>{kind}</div>
      <dl className={s.kv}>{rows.map(([k, v]) => <><dt key={k}>{k}</dt><dd key={`${k}v`}>{v}</dd></>)}</dl>
    </div>
  )
}

export function DataHub({ grid, snap, now, fleet, trackStart }: { grid: OceanGrid | null; snap: FleetSnapshot | null; now: number; fleet: FleetItem[]; trackStart: number }) {
  const imports = useOverrides((o) => o.imports)
  const addImport = useOverrides((o) => o.addImport)
  const removeImport = useOverrides((o) => o.removeImport)
  const reset = useOverrides((o) => o.reset)
  const setView = useStore((st) => st.setView)
  const [file, setFile] = useState<{ name: string; table: Table } | null>(null)
  const [map, setMap] = useState<Map4>({ lon: -1, lat: -1, label: -1, value: -1 })
  const [err, setErr] = useState('')
  const lastVms = snap ? Math.max(...snap.positions.map((p) => p.at)) : 0
  const [active, setActive] = useState<Key>('vms')
  const profiles = useOverrides((o) => o.profiles)
  const addEvent = useOverrides((o) => o.addEvent)
  const regNo = (f: FleetItem) => profiles[f.vessel.id]?.regNo ?? defaultProfile(f.vessel).regNo
  const live = fleet.filter((f) => f.status !== 'signal_lost')
  const rnd = (n: number) => Math.floor(Math.random() * n)
  const minute = () => Math.floor(Date.now() / 60000) * 60000
  let nafSeq = 0

  // VMS：每筆＝某艘船目前位置的 NAF 報文；約 1/10 刻意損壞
  const vms = useFeed(() => {
    if (!live.length) return null
    const f = live[rnd(live.length)]
    let raw = encodeNaf({ seq: ++nafSeq + rnd(9000), regNo: regNo(f), name: f.vessel.name, lat: f.pose.lat, lon: f.pose.lon, sog: f.pose.sog, cog: f.pose.cog, at: minute() })
    if (Math.random() < 0.1) raw = raw.replace(/LT\/[^/]+/, 'LT/N0512')
    return { label: `${f.vessel.name} 船位`, raw }
  }, parseNaf)

  // 浮標平台：A 廠 JSON／B 廠分號 CSV 交替；約 1/12 缺欄位
  const fad = useFeed(() => {
    if (!snap) return null
    const fr = buoyFrame(snap.buoys, trackStart, now)
    const i = rnd(fr.n)
    const b = { id: snap.buoys[i].id, at: minute(), lat: fr.pos[i * 2 + 1], lon: fr.pos[i * 2], tons: fr.tons[i] }
    const vendorA = i % 2 === 0
    let raw = vendorA ? encodeVendorA(b) : encodeVendorB(b)
    if (Math.random() < 0.08) raw = vendorA ? raw.replace('"position"', '"pos"') : raw.split(';').slice(0, 5).join(';')
    return { label: `${b.id} · ${vendorA ? 'A 廠' : 'B 廠'}`, raw }
  }, parseBuoy)

  // 電子漁獲日誌：船端上傳一筆 FLUX 下網報告 → 解析成功就寫成下網事件（航次、地圖、時間軸都會出現）
  const elog = useFeed(() => {
    const seiners = live.filter((f) => f.vessel.type === 'purse_seiner' && f.status !== 'in_port')
    if (!seiners.length) return null
    const f = seiners[rnd(seiners.length)]
    const total = 5000 + rnd(45000)
    const catches = [{ species: 'SKJ', kg: Math.round(total * 0.7) }, { species: 'YFT', kg: Math.round(total * 0.25) }, { species: 'BET', kg: Math.round(total * 0.05) }]
    let raw = encodeFlux({ reportId: crypto.randomUUID(), regNo: regNo(f), name: f.vessel.name, at: minute(), lat: f.pose.lat, lon: f.pose.lon, catches })
    if (Math.random() < 0.1) raw = raw.replace(/<Latitude>[^<]*<\/Latitude>/, '')
    return { label: `${f.vessel.name} 下網報告`, raw }
  }, parseFlux, (fields) => {
    const f = fleet.find((x) => regNo(x) === fields.vesselRegNo)
    if (!f) return
    addEvent({ id: `F${Date.now()}`, tripId: f.trip.id, vesselId: f.vessel.id, at: Date.parse(String(fields.occurredAt)), type: 'set', lon: Number(fields.lon), lat: Number(fields.lat), detail: { catchTons: Number(fields.catchTons), note: `電子漁獲日誌 · ${fields.species}` } })
  })

  const load = async (f: File) => {
    setErr('')
    try {
      const text = await f.text()
      const table = /\.(geo)?json$/i.test(f.name) ? parseGeoJson(text) : parseCsv(text)
      if (!table.rows.length) throw new Error('檔案沒有資料列')
      setFile({ name: f.name, table })
      setMap(guessMapping(table.columns))
    } catch (e) {
      setErr(`讀取失敗：${e instanceof Error ? e.message : String(e)}`)
    }
  }
  const commit = () => {
    if (!file || map.lon < 0 || map.lat < 0) return setErr('請指定經度與緯度欄位')
    const points = file.table.rows
      .map((r) => ({ lon: normLon(Number(r[map.lon])), lat: Number(r[map.lat]), label: map.label >= 0 ? r[map.label] : '', value: map.value >= 0 ? Number(r[map.value]) : undefined }))
      .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90)
    if (!points.length) return setErr('沒有可用的座標，請檢查欄位對應')
    addImport({ id: `I${Date.now()}`, name: file.name, createdAt: Date.now(), points })
    setFile(null)
  }
  const sel = (k: keyof Map4, label: string) => (
    <label className={s.field}>{label}
      <select value={map[k]} onChange={(e) => setMap({ ...map, [k]: Number(e.target.value) })}>
        <option value={-1}>（不使用）</option>
        {file!.table.columns.map((c, i) => <option key={i} value={i}>{c}</option>)}
      </select>
    </label>
  )

  return (
    <div className={s.page}>
      <Panel className={s.main} style={{ overflowY: 'auto' }}>
        <div className={s.head}><div><h1 className={s.h1}>資料串接</h1><div className={s.sub}>外部資料源的連線狀態；正式版由後端收集服務寫入 PostgreSQL＋PostGIS</div></div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          <Connector active={active === 'noaa'} onClick={() => setActive('noaa')} name="NOAA 海況" kind="海溫 OISST v2.1 · 洋流 NESDIS SSH · ERDDAP" status={['已同步', 'var(--green)']}
            rows={[['海溫資料日', day(grid?.meta.sst.time)], ['洋流資料日', day(grid?.meta.u.time)], ['更新方式', '每日排程（GitHub Actions 跑 Python ETL）'], ['格式', 'Int16 網格＋PNG，跨換日線']]} />
          <Connector active={active === 'vms'} onClick={() => setActive('vms')} name="VMS 船位" kind="衛星船位回報（模擬）" status={['接收中', 'var(--green)']}
            rows={[['格式', 'NAF（North Atlantic Format）'], ['最後接收', vms.log[0] ? fmtTime(vms.log[0].at) : lastVms ? fmtTime(lastVms) : '—'], ['本次接收', `${vms.log.length} 筆`], ['正式來源', '漁業署 VMS／船上回報']]} />
          <Connector active={active === 'fad'} onClick={() => setActive('fad')} name="FAD 浮標平台" kind="衛星聲納浮標（模擬，Satlink／Zunibal 類）" status={['接收中', 'var(--green)']}
            rows={[['格式', 'A 廠 JSON／B 廠分號 CSV'], ['浮標數', snap ? snap.buoys.length.toLocaleString() : '—'], ['本次接收', `${fad.log.length} 筆`], ['重點', '兩家格式不同，統一正規化']]} />
          <Connector active={active === 'elog'} onClick={() => setActive('elog')} name="電子漁獲日誌" kind="每一網的時間、位置、漁獲" status={['接收中', 'var(--green)']}
            rows={[['格式', 'UN/CEFACT FLUX XML'], ['寫入', '下網事件（航次／地圖）'], ['本次寫入', `${elog.log.filter((m) => m.parsed.ok).length} 筆`], ['另可', '匯入 CSV／GeoJSON']]} />
        </div>

        <div style={{ marginTop: 24 }}>
          {active === 'vms' && <InterfaceConsole title="VMS 船位介面" desc="接收衛星船位報文（NAF），驗證後對到船舶主檔的漁船編號" feed={vms}
            mapping={[['IR', '船舶主檔.漁船編號', '找出是哪艘船'], ['LT / LG', '船位.緯度／經度', '±180 轉 0–360'], ['SP', '船位.航速', '÷10＝節'], ['CO', '船位.航向', '度'], ['DA + TI', '船位.回報時間', 'UTC']]} />}
          {active === 'fad' && <InterfaceConsole title="FAD 浮標平台介面" desc="兩家廠商格式不同（JSON vs 分號 CSV、噸 vs 公斤、小數點 vs 逗號），統一正規化成浮標回報" feed={fad}
            mapping={[['buoyId ／ 欄1', '浮標.編號', ''], ['position.lat,lng ／ 欄4,5', '浮標.位置', 'B 廠小數逗號→點'], ['biomass.total_t ／ 欄6', '浮標.估計魚量（噸）', 'B 廠公斤÷1000'], ['ts ／ 欄2+3', '浮標.回報時間', '日/月/年 → ISO']]} />}
          {active === 'elog' && <InterfaceConsole title="電子漁獲日誌介面" desc="船端上傳 FLUX 下網報告；解析成功即寫入該船航次（到戰情地圖或航次管理可看到新事件）" feed={elog} auto={false}
            mapping={[['VesselTransportMeans/ID', '船舶主檔.漁船編號', '對到航次'], ['OccurrenceDateTime', '事件.時間', ''], ['RelatedFLUXLocation', '事件.位置', '±180 轉 0–360'], ['SpecifiedFACatch × n', '事件.漁獲（噸）', '各魚種公斤加總÷1000'], ['TypeCode=FISHING_OPERATION', '事件.類型＝下網', '']]} />}
          {active === 'noaa' && (
            <div>
              <div className={s.section} style={{ marginTop: 0 }}>NOAA 海況管線</div>
              <div className={s.dim} style={{ marginBottom: 10 }}>瀏覽器無法直接呼叫 NOAA（對方未開 CORS），所以走後端排程：每天 06:00 由 GitHub Actions 執行 Python ETL → 產生 Int16 網格與色圖 → 重新部署。</div>
              <pre style={{ font: '12px/18px ui-monospace, monospace', padding: 12, borderRadius: 10, background: 'rgba(0,0,0,.35)', border: '0.5px solid var(--sep)', margin: 0 }}>{`ERDDAP（OISST v2.1、NESDIS SSH）
  └─ etl/fetch_ocean.py  全球 0.5°、跨 0°/180° 接縫、赤道地轉流遮罩、離群值截斷
       └─ public/data/ocean.json ＋ sst/anom/u/v.i16（Int16，×scale）＋ sst/anom.png
            └─ 前端 DataSource.loadOcean()  → 海溫、異常、洋流粒子、游標讀值`}</pre>
            </div>
          )}
        </div>

        <div className={s.section} style={{ marginTop: 24 }}>匯入檔案</div>
        <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) load(f) }}
          style={{ display: 'block', padding: 28, borderRadius: 12, border: '1.5px dashed var(--sep)', textAlign: 'center', cursor: 'pointer', color: 'var(--label-2)' }}>
          把 CSV 或 GeoJSON 拖到這裡，或點擊選擇檔案
          <input type="file" accept=".csv,.tsv,.json,.geojson" hidden onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
        </label>
        <div className={s.actions}><a className={s.btn} style={{ lineHeight: '34px', textDecoration: 'none' }} href={dataUrl('sample_vms.csv')} download>下載範例 CSV</a></div>
        {err && <div style={{ color: 'var(--red)', marginTop: 8 }}>{err}</div>}

        {file && (
          <>
            <div className={s.section}>預覽：{file.name}（{file.table.rows.length} 列）</div>
            <div style={{ overflowX: 'auto' }}>
              <table className={s.table}>
                <thead><tr>{file.table.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>{file.table.rows.slice(0, 5).map((r, i) => <tr key={i} style={{ cursor: 'default' }}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <div className={s.section}>欄位對應</div>
            <div className={s.sub} style={{ marginBottom: 10 }}>把檔案的欄位對到系統欄位（像 FHIR mapping：來源格式不一，先對應再入庫）</div>
            <div className={s.form} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>{sel('lon', '經度 *')}{sel('lat', '緯度 *')}{sel('label', '名稱')}{sel('value', '數值')}</div>
            <div className={s.actions}><button className={`${s.btn} ${s.primary}`} onClick={commit}>加入地圖</button><button className={s.btn} onClick={() => setFile(null)}>取消</button></div>
          </>
        )}
      </Panel>
      <Panel className={s.side}>
        <div className={s.section}>已匯入圖層</div>
        {!imports.length && <div className={s.dim}>尚無。匯入後會出現在戰情地圖（橘色點）。</div>}
        {imports.map((l) => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '0.5px solid var(--sep)' }}>
            <div style={{ flex: 1 }}><b>{l.name}</b><div className={s.dim}>{l.points.length} 點 · {fmtTime(l.createdAt)}</div></div>
            <button className={s.btn} onClick={() => setView('map')}>檢視</button>
            <button className={`${s.btn} ${s.danger}`} onClick={() => removeImport(l.id)}>刪除</button>
          </div>
        ))}
        <div className={s.section} style={{ marginTop: 28 }}>示範資料</div>
        <div className={s.dim} style={{ marginBottom: 10 }}>清除所有編輯、手動事件、已處理警示與匯入圖層（存在這台電腦的瀏覽器）。現在：{fmtTime(now)}</div>
        <button className={`${s.btn} ${s.danger}`} onClick={() => confirm('確定要重設示範資料？') && reset()}>重設示範資料</button>
      </Panel>
    </div>
  )
}
