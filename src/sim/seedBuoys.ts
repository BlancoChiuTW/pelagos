// FAD 浮標（TECH_SPEC §8.3）：每艘圍網船 250–350 個，分布在作業區周圍，隨真實洋流漂移 24 小時
import { isLand, sample } from '../data/grid'
import type { Buoy, Lat, Lon, OceanGrid } from '../data/types'
import { range, type Rng } from './rng'

export const TRACK_HOURS = 24
const DEG_PER_MS_HOUR = 3600 / 111_320 // 1 m/s 漂一小時 ≈ 幾度緯度

/** 魚量期望值：SST 28–30°C 最高，離開越遠越低（示意，不是模型） */
function biomassBias(sst: number): number {
  if (Number.isNaN(sst)) return 0
  const d = sst < 28 ? 28 - sst : sst > 30 ? sst - 30 : 0
  return Math.max(0.1, 1 - d * 0.35)
}

export function seedBuoys(grid: OceanGrid, rng: Rng, owners: { vesselId: string; lon: Lon; lat: Lat }[]): Buoy[] {
  const buoys: Buoy[] = []
  for (const o of owners) {
    const count = Math.floor(range(rng, 250, 351))
    for (let k = 0; k < count; k++) {
      let lon = o.lon
      let lat = o.lat
      for (let t = 0; t < 12; t++) {
        const r = 2.8 * Math.sqrt(rng()) // 約 300 km 內
        const a = rng() * Math.PI * 2
        lon = o.lon + (r * Math.cos(a)) / Math.cos((o.lat * Math.PI) / 180)
        lat = o.lat + r * Math.sin(a)
        if (!isLand(grid, grid.sst, lon, lat)) break
      }
      const n = TRACK_HOURS + 1
      const tracks = new Float32Array(n * 2)
      const biomass = new Float32Array(n)
      const base = 60 * biomassBias(sample(grid, grid.sst, lon, lat)) * rng() ** 1.6
      for (let h = 0; h < n; h++) {
        tracks[h * 2] = lon
        tracks[h * 2 + 1] = lat
        biomass[h] = Math.max(0, base + (rng() - 0.45) * 4 * (h / n))
        const u = sample(grid, grid.u, lon, lat)
        const v = sample(grid, grid.v, lon, lat)
        if (!Number.isNaN(u) && !Number.isNaN(v)) {
          const nlon = lon + (u * DEG_PER_MS_HOUR) / Math.max(Math.cos((lat * Math.PI) / 180), 0.2)
          const nlat = lat + v * DEG_PER_MS_HOUR
          if (!isLand(grid, grid.sst, nlon, nlat)) {
            lon = nlon
            lat = nlat
          }
        }
      }
      buoys.push({ id: `${o.vesselId}-B${String(k).padStart(3, '0')}`, vesselId: o.vesselId, tracks, biomass })
    }
  }
  return buoys
}
