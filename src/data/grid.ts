// 網格取樣與經度工具（純函式，不得 import React）
import type { GridMeta, Lat, Lon } from './types'

/** 任意經度 → 0–360 */
export function normLon(lon: Lon): Lon {
  const l = lon % 360
  return l < 0 ? l + 360 : l
}

/** 0–360 經度 → 顯示用字串，例：210 → "150.00°W" */
export function fmtLon(lon: Lon, digits = 2): string {
  const l = normLon(lon)
  return l > 180 ? `${(360 - l).toFixed(digits)}°W` : `${l.toFixed(digits)}°E`
}

export function fmtLat(lat: Lat, digits = 2): string {
  return lat < 0 ? `${(-lat).toFixed(digits)}°S` : `${lat.toFixed(digits)}°N`
}

/** 經緯度 → 浮點格座標（格心為整數）；超出範圍回傳 null */
export function toCell(g: GridMeta, lon: Lon, lat: Lat): [number, number] | null {
  let c = (normLon(lon) - g.lon0) / g.dlon
  const r = (lat - g.lat0) / g.dlat
  if (r < 0 || r > g.height - 1) return null
  if (g.wrap) c = ((c % g.width) + g.width) % g.width // 全球：最後一欄與第一欄相接
  else if (c < 0 || c > g.width - 1) return null
  return [c, r]
}

/** 雙線性內插；有權重的角落中任一為 NaN（陸地）或超出範圍 → NaN */
export function sample(g: GridMeta, field: Float32Array, lon: Lon, lat: Lat): number {
  const cell = toCell(g, lon, lat)
  if (!cell) return NaN
  const [c, r] = cell
  const c0 = Math.floor(c)
  const r0 = Math.floor(r)
  const c1 = g.wrap ? (c0 + 1) % g.width : Math.min(c0 + 1, g.width - 1)
  const r1 = Math.min(r0 + 1, g.height - 1)
  const fc = c - c0
  const fr = r - r0
  const w = g.width
  // 權重為 0 的角落不參與（否則格心旁邊是陸地時 NaN×0 也會變 NaN）
  const corners: [number, number][] = [
    [r0 * w + c0, (1 - fc) * (1 - fr)],
    [r0 * w + c1, fc * (1 - fr)],
    [r1 * w + c0, (1 - fc) * fr],
    [r1 * w + c1, fc * fr],
  ]
  let sum = 0
  for (const [i, wt] of corners) {
    if (wt === 0) continue
    const val = field[i]
    if (Number.isNaN(val)) return NaN
    sum += val * wt
  }
  return sum
}

/** 最近格是否為陸地（或超出範圍） */
export function isLand(g: GridMeta, field: Float32Array, lon: Lon, lat: Lat): boolean {
  const cell = toCell(g, lon, lat)
  if (!cell) return true
  const i = Math.round(cell[1]) * g.width + (Math.round(cell[0]) % g.width)
  return Number.isNaN(field[i])
}

/** Int16 原始資料 → Float32（×scale），nodata → NaN */
export function decodeI16(buf: ArrayBuffer, scale: number, nodata: number): Float32Array {
  const src = new Int16Array(buf)
  const out = new Float32Array(src.length)
  for (let i = 0; i < src.length; i++) out[i] = src[i] === nodata ? NaN : src[i] * scale
  return out
}
