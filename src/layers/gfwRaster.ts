// 周邊漁船活動（GFW）：載入時一次畫成 0.5° 圖片，交給 MapLibre image source（跟海溫同做法）
// 取代 deck HeatmapLayer：熱度圖每次平移縮放都要重新聚合 → 卡頓；而且以畫面最大值正規化，
// 沿岸拖網（時數是遠洋的數百倍）會把熱帶太平洋壓到看不見。這裡改成固定的對數＋百分位色階。
import type * as maplibregl from 'maplibre-gl'
import type { FishingEffort } from '../data/types'

const ID = 'pelagos-gfw'
/** 預設篩選：遠洋漁業（和藍潮同類的同業），排除沿岸拖網、刺網、定置 */
export const PELAGIC = ['tuna_purse_seines', 'purse_seines', 'other_purse_seines', 'drifting_longlines', 'squid_jigger', 'pole_and_line']

export function gearSet(e: FishingEffort, gear: string): Set<number> {
  const names = gear === 'pelagic' ? PELAGIC : gear === 'all' ? e.gears : [gear]
  return new Set(names.map((g) => e.gears.indexOf(g)).filter((i) => i >= 0))
}

/** 畫成 dataURL；回傳圖片與四角座標 */
export function renderGfw(e: FishingEffort, gear: string): { url: string; coords: [[number, number], [number, number], [number, number], [number, number]] } | null {
  const keep = gearSet(e, gear)
  const cells = e.cells.filter((c) => keep.has(c[3]))
  if (!cells.length) return null
  const B = 0.5
  let w = Infinity, s = Infinity, ea = -Infinity, n = -Infinity
  for (const c of cells) { w = Math.min(w, c[0]); ea = Math.max(ea, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]) }
  w -= B / 2; s -= B / 2; ea += B / 2; n += B / 2
  const W = Math.round((ea - w) / B), H = Math.round((n - s) / B)
  const v = new Float32Array(W * H)
  for (const c of cells) {
    const x = Math.min(W - 1, Math.floor((c[0] - w) / B)), y = Math.min(H - 1, Math.floor((n - c[1]) / B)) // 北在上
    v[y * W + x] += c[2]
  }
  // 對數 → 第 99 百分位當滿格、第 35 百分位以下不畫（不被沿岸極值壓掉，也不讓零星活動鋪滿畫面）
  const logs = Array.from(v).filter((x) => x > 0).map(Math.log1p).sort((a, b) => a - b)
  const top = logs[Math.floor(logs.length * 0.99)] || 1
  const floor = logs[Math.floor(logs.length * 0.35)] || 0
  const small = document.createElement('canvas')
  small.width = W; small.height = H
  const ctx = small.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const ramp: [number, number, number, number][] = [[0, 90, 50, 160], [0.35, 150, 80, 200], [0.7, 235, 120, 210], [1, 255, 215, 240]]
  for (let i = 0; i < v.length; i++) {
    if (v[i] <= 0) continue
    const lv = Math.log1p(v[i])
    if (lv < floor) continue
    const t = Math.min(1, (lv - floor) / (top - floor || 1))
    let k = 1
    while (k < ramp.length - 1 && t > ramp[k][0]) k++
    const [t0, ...c0] = ramp[k - 1], [t1, ...c1] = ramp[k]
    const f = (t - t0) / (t1 - t0 || 1)
    img.data[i * 4] = c0[0] + (c1[0] - c0[0]) * f
    img.data[i * 4 + 1] = c0[1] + (c1[1] - c0[1]) * f
    img.data[i * 4 + 2] = c0[2] + (c1[2] - c0[2]) * f
    img.data[i * 4 + 3] = 235 * t ** 1.6 // 低活動近乎透明，熱點才明顯
  }
  ctx.putImageData(img, 0, 0)
  // 放大 4 倍並輕微模糊，成柔和的熱度感（只做一次）
  const big = document.createElement('canvas')
  big.width = W * 4; big.height = H * 4
  const bctx = big.getContext('2d')!
  bctx.filter = 'blur(2px)'
  bctx.imageSmoothingEnabled = true
  bctx.drawImage(small, 0, 0, big.width, big.height)
  return { url: big.toDataURL('image/png'), coords: [[w, n], [ea, n], [ea, s], [w, s]] }
}

/** 掛上或更新 GFW 圖層（插在陸地之前：海上可見、陸地蓋住） */
export function showGfw(map: maplibregl.Map, e: FishingEffort | null, gear: string, on: boolean) {
  const r = on && e ? renderGfw(e, gear) : null
  const src = map.getSource(ID) as maplibregl.ImageSource | undefined
  if (!r) {
    if (map.getLayer(ID)) map.setPaintProperty(ID, 'raster-opacity', 0)
    return
  }
  if (src) src.updateImage({ url: r.url, coordinates: r.coords })
  else {
    map.addSource(ID, { type: 'image', url: r.url, coordinates: r.coords })
    const before = map.getLayer('pelagos-land') ? 'pelagos-land' : undefined
    map.addLayer({ id: ID, type: 'raster', source: ID, paint: { 'raster-opacity': 0, 'raster-resampling': 'linear', 'raster-fade-duration': 0, 'raster-opacity-transition': { duration: 500 } } }, before)
  }
  map.setPaintProperty(ID, 'raster-opacity', 0.65)
}
