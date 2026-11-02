// 三個外部介面的訊息格式（M03）：產生原始訊息（模擬對方系統）＋解析驗證（我方介面引擎）
// VMS＝NAF（North Atlantic Format）、浮標＝兩家廠商格式、電子漁獲日誌＝UN/CEFACT FLUX（簡化）
import { normLon } from '../grid'

export type Parsed = { ok: true; fields: Record<string, string | number> } | { ok: false; error: string }

// ── VMS：NAF ─────────────────────────────────────────────
const pad = (n: number, w: number) => String(Math.round(n)).padStart(w, '0')
const sign = (x: number, w: number) => `${x < 0 ? '-' : '+'}${Math.abs(x).toFixed(3).padStart(w + 4, '0')}`
function nafDate(t: number) {
  const d = new Date(t)
  return { DA: `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1, 2)}${pad(d.getUTCDate(), 2)}`, TI: `${pad(d.getUTCHours(), 2)}${pad(d.getUTCMinutes(), 2)}` }
}
export function encodeNaf(p: { seq: number; regNo: string; name: string; lat: number; lon: number; sog: number; cog: number; at: number }): string {
  const lon = p.lon > 180 ? p.lon - 360 : p.lon // NAF 用 ±180
  const { DA, TI } = nafDate(p.at)
  return `//SR//AD/TWN//SQ/${pad(p.seq, 6)}//TM/POS//IR/${p.regNo}//NA/${p.name}//LT/${sign(p.lat, 2)}//LG/${sign(lon, 3)}//SP/${pad(p.sog * 10, 3)}//CO/${pad(p.cog, 3)}//DA/${DA}//TI/${TI}//ER//`
}
export function parseNaf(raw: string): Parsed {
  if (!raw.startsWith('//SR//') || !raw.endsWith('//ER//')) return { ok: false, error: '訊息框架錯誤：缺少 //SR// 或 //ER//' }
  const kv: Record<string, string> = {}
  for (const part of raw.slice(6, -6).split('//')) {
    const i = part.indexOf('/')
    if (i > 0) kv[part.slice(0, i)] = part.slice(i + 1)
  }
  for (const k of ['IR', 'LT', 'LG', 'SP', 'CO', 'DA', 'TI']) if (!kv[k]) return { ok: false, error: `缺少必要欄位 ${k}` }
  const lat = Number(kv.LT), lon = Number(kv.LG)
  if (!/^[+-]\d{2}\.\d{3}$/.test(kv.LT) || Math.abs(lat) > 90) return { ok: false, error: `LT 緯度格式錯誤：${kv.LT}` }
  if (!/^[+-]\d{3}\.\d{3}$/.test(kv.LG) || Math.abs(lon) > 180) return { ok: false, error: `LG 經度格式錯誤：${kv.LG}` }
  const at = Date.UTC(+kv.DA.slice(0, 4), +kv.DA.slice(4, 6) - 1, +kv.DA.slice(6, 8), +kv.TI.slice(0, 2), +kv.TI.slice(2, 4))
  return { ok: true, fields: { vesselRegNo: kv.IR, name: kv.NA ?? '', lat, lon: normLon(lon), sogKn: Number(kv.SP) / 10, cogDeg: Number(kv.CO), reportedAt: new Date(at).toISOString() } }
}

// ── FAD 浮標：A 廠 JSON、B 廠分號 CSV（小數逗號）─────────────
export function encodeVendorA(b: { id: string; at: number; lat: number; lon: number; tons: number }): string {
  return JSON.stringify({ buoyId: b.id, ts: new Date(b.at).toISOString(), position: { lat: +b.lat.toFixed(4), lng: +(b.lon > 180 ? b.lon - 360 : b.lon).toFixed(4) }, biomass: { total_t: +b.tons.toFixed(1), layers_m: [10, 50, 100, 150] } })
}
export function encodeVendorB(b: { id: string; at: number; lat: number; lon: number; tons: number }): string {
  const d = new Date(b.at)
  const lon = b.lon > 180 ? b.lon - 360 : b.lon
  const c = (x: number, n: number) => x.toFixed(n).replace('.', ',')
  return `${b.id};${pad(d.getUTCDate(), 2)}/${pad(d.getUTCMonth() + 1, 2)}/${d.getUTCFullYear()};${pad(d.getUTCHours(), 2)}:${pad(d.getUTCMinutes(), 2)};${c(b.lat, 4)};${c(lon, 4)};${c(b.tons * 1000, 0)}`
}
export function parseBuoy(raw: string): Parsed {
  if (raw.trim().startsWith('{')) {
    try {
      const j = JSON.parse(raw) as { buoyId?: string; ts?: string; position?: { lat?: number; lng?: number }; biomass?: { total_t?: number } }
      if (!j.buoyId || !j.position || j.position.lat === undefined || j.position.lng === undefined) return { ok: false, error: 'A 廠 JSON 缺少 buoyId 或 position' }
      return { ok: true, fields: { vendor: 'A（JSON）', buoyId: j.buoyId, lat: j.position.lat, lon: normLon(j.position.lng), biomassTons: j.biomass?.total_t ?? 0, reportedAt: j.ts ?? '' } }
    } catch {
      return { ok: false, error: 'A 廠 JSON 無法解析' }
    }
  }
  const c = raw.split(';')
  if (c.length !== 6) return { ok: false, error: `B 廠 CSV 欄位數應為 6，收到 ${c.length}` }
  const num = (s: string) => Number(s.replace(',', '.'))
  const [dd, mm, yy] = c[1].split('/').map(Number)
  const [hh, mi] = c[2].split(':').map(Number)
  const lat = num(c[3]), lon = num(c[4])
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { ok: false, error: '座標不是數字' }
  return { ok: true, fields: { vendor: 'B（分號 CSV，公斤）', buoyId: c[0], lat, lon: normLon(lon), biomassTons: num(c[5]) / 1000, reportedAt: new Date(Date.UTC(yy, mm - 1, dd, hh, mi)).toISOString() } }
}

// ── 電子漁獲日誌：FLUX FA Report（簡化）──────────────────────
export function encodeFlux(r: { reportId: string; regNo: string; name: string; at: number; lat: number; lon: number; catches: { species: string; kg: number }[] }): string {
  const lon = r.lon > 180 ? r.lon - 360 : r.lon
  return `<FLUXFAReportMessage>
  <FLUXReportDocument><ID schemeID="UUID">${r.reportId}</ID><PurposeCode>9</PurposeCode></FLUXReportDocument>
  <FAReportDocument><TypeCode>DECLARATION</TypeCode>
    <SpecifiedVesselTransportMeans><ID schemeID="CFR">${r.regNo}</ID><Name>${r.name}</Name></SpecifiedVesselTransportMeans>
    <SpecifiedFishingActivity><TypeCode>FISHING_OPERATION</TypeCode>
      <OccurrenceDateTime>${new Date(r.at).toISOString()}</OccurrenceDateTime>
      <RelatedFLUXLocation><Latitude>${r.lat.toFixed(4)}</Latitude><Longitude>${lon.toFixed(4)}</Longitude></RelatedFLUXLocation>
${r.catches.map((c) => `      <SpecifiedFACatch><SpeciesCode>${c.species}</SpeciesCode><WeightMeasure unitCode="KGM">${c.kg}</WeightMeasure></SpecifiedFACatch>`).join('\n')}
    </SpecifiedFishingActivity>
  </FAReportDocument>
</FLUXFAReportMessage>`
}
export function parseFlux(raw: string): Parsed {
  const doc = new DOMParser().parseFromString(raw, 'application/xml')
  if (doc.querySelector('parsererror')) return { ok: false, error: 'XML 結構錯誤' }
  const q = (sel: string) => doc.querySelector(sel)?.textContent?.trim() ?? ''
  if (q('SpecifiedFishingActivity > TypeCode') !== 'FISHING_OPERATION') return { ok: false, error: '不支援的活動類型' }
  const lat = Number(q('Latitude')), lon = Number(q('Longitude'))
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !q('Latitude')) return { ok: false, error: '缺少作業位置' }
  const catches = [...doc.querySelectorAll('SpecifiedFACatch')].map((c) => ({ sp: c.querySelector('SpeciesCode')?.textContent ?? '?', kg: Number(c.querySelector('WeightMeasure')?.textContent ?? 0) }))
  const tons = catches.reduce((a, c) => a + c.kg, 0) / 1000
  return { ok: true, fields: { reportId: q('FLUXReportDocument > ID'), vesselRegNo: q('SpecifiedVesselTransportMeans > ID'), name: q('SpecifiedVesselTransportMeans > Name'), occurredAt: q('OccurrenceDateTime'), lat, lon: normLon(lon), species: catches.map((c) => `${c.sp} ${(c.kg / 1000).toFixed(1)}t`).join('、'), catchTons: +tons.toFixed(1) } }
}
