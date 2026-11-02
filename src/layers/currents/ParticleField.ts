// 洋流粒子的純運算（TECH_SPEC §7）：給網格與可視範圍 → 每幀更新粒子位置。不碰 DOM。
import { sample } from '../../data/grid'
import type { OceanGrid } from '../../data/types'
import type { Rng } from '../../sim/rng'

export type Bounds = [number, number, number, number] // [w, s, e, n]，經度 0–360 連續

const MIN_SPEED = 0.02 // m/s，低於此視為無流（赤道帶、陸地邊）

export class ParticleField {
  readonly n: number
  lon: Float32Array
  lat: Float32Array
  /** 上一幀位置，給畫線段用 */
  plon: Float32Array
  plat: Float32Array
  age: Uint16Array
  maxAge: Uint16Array
  /** 當前流速（m/s），給上色用 */
  speed: Float32Array
  private bounds: Bounds
  private grid: OceanGrid
  private rng: Rng

  constructor(grid: OceanGrid, n: number, rng: Rng, bounds: Bounds) {
    this.grid = grid
    this.rng = rng
    this.n = n
    this.lon = new Float32Array(n)
    this.lat = new Float32Array(n)
    this.plon = new Float32Array(n)
    this.plat = new Float32Array(n)
    this.age = new Uint16Array(n)
    this.maxAge = new Uint16Array(n)
    this.speed = new Float32Array(n)
    this.bounds = this.clip(bounds)
    for (let i = 0; i < n; i++) this.spawn(i, true)
  }

  /** 可視範圍與網格範圍取交集 */
  private clip([w, s, e, n]: Bounds): Bounds {
    const [gw, gs, ge, gn] = this.grid.bounds
    return [Math.max(w, gw), Math.max(s, gs), Math.min(e, ge), Math.min(n, gn)]
  }

  reseed(bounds: Bounds) {
    this.bounds = this.clip(bounds)
    for (let i = 0; i < this.n; i++) this.spawn(i, true)
  }

  /** 在可視範圍內找一個有流的位置；試 8 次找不到就放著（下一幀再試） */
  private spawn(i: number, randomAge: boolean) {
    const [w, s, e, n] = this.bounds
    for (let t = 0; t < 8; t++) {
      const lon = w + (e - w) * this.rng()
      const lat = s + (n - s) * this.rng()
      const u = sample(this.grid, this.grid.u, lon, lat)
      if (Number.isNaN(u)) continue
      const v = sample(this.grid, this.grid.v, lon, lat)
      if (Math.hypot(u, v) < MIN_SPEED) continue
      this.lon[i] = this.plon[i] = lon
      this.lat[i] = this.plat[i] = lat
      break
    }
    this.maxAge[i] = 60 + Math.floor(this.rng() * 40)
    this.age[i] = randomAge ? Math.floor(this.rng() * this.maxAge[i]) : 0
  }

  /**
   * 前進一幀。degPerMs：1 m/s 在這一幀要走幾度經度（由畫面縮放換算，讓視覺速度固定）
   * 回傳本幀「有畫線段」的粒子數
   */
  step(degPerMs: number): number {
    const [w, s, e, n] = this.bounds
    let moved = 0
    for (let i = 0; i < this.n; i++) {
      const lon = this.lon[i]
      const lat = this.lat[i]
      const u = sample(this.grid, this.grid.u, lon, lat)
      const v = sample(this.grid, this.grid.v, lon, lat)
      const spd = Math.hypot(u, v)
      if (++this.age[i] > this.maxAge[i] || Number.isNaN(spd) || spd < MIN_SPEED) {
        this.spawn(i, false)
        continue
      }
      const nlon = lon + (u * degPerMs) / Math.max(Math.cos((lat * Math.PI) / 180), 0.2)
      const nlat = lat + v * degPerMs
      if (nlon < w || nlon > e || nlat < s || nlat > n) {
        this.spawn(i, false)
        continue
      }
      this.plon[i] = lon
      this.plat[i] = lat
      this.lon[i] = nlon
      this.lat[i] = nlat
      this.speed[i] = spd
      moved++
    }
    return moved
  }
}

/** 粒子數：依畫布面積，夾在 [2000, max] */
export function particleCount(cssWidth: number, cssHeight: number, max: number): number {
  return Math.max(2000, Math.min(max, Math.round((cssWidth * cssHeight) / 180)))
}
