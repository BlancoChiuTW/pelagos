// 浮標清單（M05）：依目前估計魚量排序，回答「下一網去哪」；點「前往」→ 地圖飛到浮標
import { useMemo, useState } from 'react'
import { fmtLat, fmtLon } from '../data/grid'
import type { FleetSnapshot } from '../data/types'
import type { FleetItem } from '../data/useFleet'
import { buoyFrame } from '../layers/buoys'
import { Panel } from '../hud/Panel'
import s from './Page.module.css'

export function Buoys({ snap, fleet, trackStart, now, onGo }: { snap: FleetSnapshot; fleet: FleetItem[]; trackStart: number; now: number; onGo: (lon: number, lat: number) => void }) {
  const [owner, setOwner] = useState('all')
  const rows = useMemo(() => {
    const fr = buoyFrame(snap.buoys, trackStart, now)
    const out = snap.buoys.map((b, i) => ({ b, lon: fr.pos[i * 2], lat: fr.pos[i * 2 + 1], tons: fr.tons[i], delta: fr.tons[i] - b.biomass[0] }))
    return out.filter((r) => owner === 'all' || r.b.vesselId === owner).sort((a, b) => b.tons - a.tons).slice(0, 60)
  }, [snap, trackStart, now, owner])
  const name = (id: string) => fleet.find((f) => f.vessel.id === id)?.vessel.name ?? id
  const seiners = fleet.filter((f) => f.vessel.type === 'purse_seiner')
  return (
    <Panel style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className={s.head}>
        <div><h1 className={s.h1}>FAD 浮標</h1><div className={s.sub}>共 {snap.buoys.length.toLocaleString()} 個啟用浮標 · 依聲納估計魚量排序（前 60）· 模擬資料</div></div>
        <div className={s.grow} />
        <label className={s.field} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>所屬船
          <select value={owner} onChange={(e) => setOwner(e.target.value)} style={{ height: 34, borderRadius: 8, background: 'var(--fill)', color: 'var(--label)', border: 0, padding: '0 8px' }}>
            <option value="all">全部</option>{seiners.map((f) => <option key={f.vessel.id} value={f.vessel.id}>{f.vessel.name}</option>)}
          </select>
        </label>
      </div>
      <div className={s.scroll}>
        <table className={s.table}>
          <thead><tr><th>#</th><th>浮標</th><th>所屬船</th><th>位置</th><th>估計魚量</th><th>24 小時變化</th><th /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.b.id} style={{ cursor: 'default' }}>
                <td className={s.dim}>{i + 1}</td>
                <td>{r.b.id}</td>
                <td>{name(r.b.vesselId)}</td>
                <td className={s.dim}>{fmtLat(r.lat, 2)} {fmtLon(r.lon, 2)}</td>
                <td><span className={s.bar}><i style={{ width: `${Math.min(100, (r.tons / 60) * 100)}%`, background: 'var(--tint)' }} /></span><b>{r.tons.toFixed(1)}</b> 噸</td>
                <td style={{ color: r.delta >= 0 ? 'var(--green)' : 'var(--red)' }}>{r.delta >= 0 ? '+' : ''}{r.delta.toFixed(1)}</td>
                <td style={{ textAlign: 'right' }}><button className={s.btn} onClick={() => onGo(r.lon, r.lat)}>前往</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
