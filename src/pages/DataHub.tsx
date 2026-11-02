// 資料串接（M03）：連線清單（像 HIS 的介面引擎）＋檔案匯入（預覽 → 欄位對應 → 上地圖）
import { useState } from 'react'
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

function Connector({ name, kind, status, rows }: { name: string; kind: string; status: [string, string]; rows: [string, string][] }) {
  return (
    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '0.5px solid var(--sep)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <b style={{ font: 'var(--t-headline)' }}>{name}</b>
        <span className={s.chip} style={{ color: status[1], marginLeft: 'auto' }}>{status[0]}</span>
      </div>
      <div className={s.dim} style={{ marginBottom: 8 }}>{kind}</div>
      <dl className={s.kv}>{rows.map(([k, v]) => <><dt key={k}>{k}</dt><dd key={`${k}v`}>{v}</dd></>)}</dl>
    </div>
  )
}

export function DataHub({ grid, snap, now }: { grid: OceanGrid | null; snap: FleetSnapshot | null; now: number }) {
  const imports = useOverrides((o) => o.imports)
  const addImport = useOverrides((o) => o.addImport)
  const removeImport = useOverrides((o) => o.removeImport)
  const reset = useOverrides((o) => o.reset)
  const setView = useStore((st) => st.setView)
  const [file, setFile] = useState<{ name: string; table: Table } | null>(null)
  const [map, setMap] = useState<Map4>({ lon: -1, lat: -1, label: -1, value: -1 })
  const [err, setErr] = useState('')
  const lastVms = snap ? Math.max(...snap.positions.map((p) => p.at)) : 0

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
          <Connector name="NOAA 海況" kind="海溫 OISST v2.1 · 洋流 NESDIS SSH · ERDDAP" status={['已同步', 'var(--green)']}
            rows={[['海溫資料日', day(grid?.meta.sst.time)], ['洋流資料日', day(grid?.meta.u.time)], ['更新方式', '每日排程（GitHub Actions 跑 Python ETL）'], ['格式', 'Int16 網格＋PNG，跨換日線']]} />
          <Connector name="VMS 船位" kind="衛星船位回報（模擬）" status={['接收中', 'var(--green)']}
            rows={[['最後接收', lastVms ? fmtTime(lastVms) : '—'], ['頻率', '每小時'], ['船數', snap ? `${snap.vessels.length} 艘` : '—'], ['正式來源', '漁業署 VMS／船上回報']]} />
          <Connector name="FAD 浮標平台" kind="衛星聲納浮標（模擬，Satlink／Zunibal 類）" status={['接收中', 'var(--green)']}
            rows={[['浮標數', snap ? snap.buoys.length.toLocaleString() : '—'], ['頻率', '每小時位置＋估計魚量'], ['正式來源', '各浮標廠商 API（格式不一，需轉換）']]} />
          <Connector name="電子漁獲日誌" kind="每一網的時間、位置、漁獲" status={['檔案匯入', 'var(--orange)']}
            rows={[['方式', '下方匯入 CSV／GeoJSON'], ['交換標準', 'UN/CEFACT FLUX（歐盟）'], ['已匯入圖層', `${imports.length} 個`]]} />
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
