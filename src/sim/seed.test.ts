import { describe, expect, it } from 'vitest'
import { isLand } from '../data/grid'
import { HOUR } from './geo'
import { seed } from './seed'
import { REEFERS, SEINERS, SHOWCASE } from './seedFleet'
import { statusOf } from './status'
import { loadGrid } from './testGrid'

const grid = loadGrid()
const now = Date.UTC(2026, 10, 3, 4)
const snap = seed(grid, now)
const [w, s, e, n] = grid.bounds
const inBounds = (lon: number, lat: number) => lon >= w && lon <= e && lat >= s && lat <= n

describe('seed', () => {
  it('船數與航次數符合規格', () => {
    expect(snap.vessels).toHaveLength(SEINERS + REEFERS)
    expect(snap.trips).toHaveLength(SEINERS + REEFERS)
  })
  it('所有船位都在海上、在範圍內', () => {
    for (const p of snap.positions) {
      expect(inBounds(p.lon, p.lat)).toBe(true)
      expect(isLand(grid, grid.sst, p.lon, p.lat), `${p.vesselId} ${p.lon},${p.lat}`).toBe(false)
    }
  })
  it('浮標約 9,000 個、全在海上', () => {
    expect(snap.buoys.length).toBeGreaterThan(7500)
    expect(snap.buoys.length).toBeLessThan(10600)
    for (const b of snap.buoys) {
      for (let h = 0; h < b.tracks.length / 2; h++) {
        expect(isLand(grid, grid.sst, b.tracks[h * 2], b.tracks[h * 2 + 1])).toBe(false)
      }
    }
  })
  it('同種子同結果', () => {
    const again = seed(grid, now)
    expect(again.positions.slice(0, 50)).toEqual(snap.positions.slice(0, 50))
    expect(again.buoys[123].tracks).toEqual(snap.buoys[123].tracks)
  })
  it('展示狀況：2 艘訊號中斷、1 艘油料低、1 艘在港', () => {
    const track = (id: string) => snap.positions.filter((p) => p.vesselId === id)
    for (const i of SHOWCASE.signalLost) expect(statusOf(track(`PS${101 + i}`), now)).toBe('signal_lost')
    expect(statusOf(track(`PS${101 + SHOWCASE.inPort}`), now)).toBe('in_port')
    expect(snap.trips.find((t) => t.vesselId === `PS${101 + SHOWCASE.lowFuel}`)?.summary.fuelPct).toBeLessThan(20)
  })
  it('事件依時間排序、每個航次都有出港事件', () => {
    for (let i = 1; i < snap.events.length; i++) expect(snap.events[i].at).toBeGreaterThanOrEqual(snap.events[i - 1].at)
    for (const t of snap.trips) expect(snap.events.some((ev) => ev.tripId === t.id && ev.type === 'depart')).toBe(true)
    expect(snap.events.every((ev) => ev.at <= now + HOUR)).toBe(true)
  })
})
