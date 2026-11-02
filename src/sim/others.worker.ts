/// <reference lib="webworker" />
// 周邊船隻模擬（F04、TECH_SPEC §8.4）。主執行緒送 tick，回傳 Float32Array [lon,lat]*count（transfer，不複製）
import type { GridMeta } from '../data/types'
import { mulberry32 } from './rng'

export type ToWorker =
  | { kind: 'init'; count: number; seed: number; landmask: Uint8Array; grid: GridMeta; t: number }
  | { kind: 'tick'; t: number }
export type FromWorker = { kind: 'frame'; t: number; count: number; positions: Float32Array }

const NM_PER_DEG = 60
let grid: GridMeta
let land: Uint8Array
let n = 0
let lon: Float32Array, lat: Float32Array, vlon: Float32Array, vlat: Float32Array
let lastT = 0

const isLand = (x: number, y: number) => {
  const c = Math.round((x - grid.lon0) / grid.dlon)
  const r = Math.round((y - grid.lat0) / grid.dlat)
  if (c < 0 || r < 0 || c >= grid.width || r >= grid.height) return true
  return land[r * grid.width + c] === 1
}

function init(m: Extract<ToWorker, { kind: 'init' }>) {
  grid = m.grid
  land = m.landmask
  n = m.count
  lastT = m.t
  const rng = mulberry32(m.seed)
  lon = new Float32Array(n); lat = new Float32Array(n); vlon = new Float32Array(n); vlat = new Float32Array(n)
  const [w, s, e, nn] = grid.bounds
  for (let i = 0; i < n; i++) {
    // 60% 在熱帶作業區、40% 全域散布
    const tropical = rng() < 0.6
    for (let t = 0; t < 20; t++) {
      const x = tropical ? 130 + rng() * 70 : w + rng() * (e - w)
      const y = tropical ? -10 + rng() * 25 : s + rng() * (nn - s)
      if (!isLand(x, y)) { lon[i] = x; lat[i] = y; break }
    }
    const kn = rng() < 0.3 ? rng() * 2 : 6 + rng() * 8 // 30% 慢速（作業／漂流）
    const hd = rng() * Math.PI * 2
    vlat[i] = (kn * Math.cos(hd)) / NM_PER_DEG // 度／小時
    vlon[i] = (kn * Math.sin(hd)) / (NM_PER_DEG * Math.max(Math.cos((lat[i] * Math.PI) / 180), 0.2))
  }
}

function tick(t: number): FromWorker {
  const dh = Math.max(-6, Math.min(6, (t - lastT) / 3_600_000)) // 一次最多推 6 小時，避免跳太遠
  lastT = t
  const out = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) {
    const x = lon[i] + vlon[i] * dh
    const y = lat[i] + vlat[i] * dh
    if (isLand(x, y)) { vlon[i] = -vlon[i]; vlat[i] = -vlat[i] } // 撞陸地掉頭
    else { lon[i] = x; lat[i] = y }
    out[i * 2] = lon[i]
    out[i * 2 + 1] = lat[i]
  }
  return { kind: 'frame', t, count: n, positions: out }
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data
  if (m.kind === 'init') init(m)
  const f = tick(m.t)
  ;(self as DedicatedWorkerGlobalScope).postMessage(f, [f.positions.buffer])
}
