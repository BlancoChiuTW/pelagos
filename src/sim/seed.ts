// 模擬資料總入口（S01）：船舶 → 航次 → 事件、船位、浮標。固定種子，每次載入結果相同。
import type { Epoch, FleetSnapshot, OceanGrid } from '../data/types'
import { mulberry32, SEED } from './rng'
import { seedBuoys } from './seedBuoys'
import { seedFleet } from './seedFleet'

export function seed(grid: OceanGrid, now: Epoch): FleetSnapshot {
  const rng = mulberry32(SEED)
  const fleet = seedFleet(grid, rng, now)
  const buoys = seedBuoys(grid, rng, fleet.bases)
  const perVessel = new Map<string, number>()
  for (const b of buoys) perVessel.set(b.vesselId, (perVessel.get(b.vesselId) ?? 0) + 1)
  for (const t of fleet.trips) t.summary.activeBuoys = perVessel.get(t.vesselId) ?? 0
  return { vessels: fleet.vessels, trips: fleet.trips, events: fleet.events, positions: fleet.positions, buoys }
}
