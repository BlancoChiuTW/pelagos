import { describe, expect, it } from 'vitest'
import type { OceanGrid } from '../../data/types'
import { mulberry32 } from '../../sim/rng'
import { ParticleField, particleCount } from './ParticleField'

// 10×10 網格、全海、向東 1 m/s
function grid(): OceanGrid {
  const n = 100
  const f = (v: number) => new Float32Array(n).fill(v)
  const meta = { time: '', source: '', unit: '' }
  return {
    width: 10, height: 10, lon0: 0, lat0: 0, dlon: 1, dlat: 1, bounds: [-0.5, -0.5, 9.5, 9.5],
    sst: f(28), anom: f(0), u: f(1), v: f(0), meta: { sst: meta, anom: meta, u: meta, v: meta },
  }
}

describe('ParticleField', () => {
  it('粒子都撒在可視範圍內', () => {
    const pf = new ParticleField(grid(), 200, mulberry32(1), [2, 2, 6, 6])
    for (let i = 0; i < pf.n; i++) {
      expect(pf.lon[i]).toBeGreaterThanOrEqual(2)
      expect(pf.lon[i]).toBeLessThanOrEqual(6)
    }
  })
  it('沿流向前進', () => {
    const pf = new ParticleField(grid(), 50, mulberry32(2), [0, 0, 9, 9])
    pf.age.fill(0)
    const before = Float32Array.from(pf.lon)
    pf.step(0.01)
    let east = 0
    for (let i = 0; i < pf.n; i++) if (pf.lon[i] > before[i]) east++
    expect(east).toBeGreaterThan(40)
  })
  it('出界的粒子會被重撒回範圍內', () => {
    const pf = new ParticleField(grid(), 100, mulberry32(3), [0, 0, 4, 4])
    for (let k = 0; k < 50; k++) pf.step(0.5) // 每幀 0.5°，很快就出界
    for (let i = 0; i < pf.n; i++) expect(pf.lon[i]).toBeLessThanOrEqual(4)
  })
  it('粒子數夾在 2000 與上限之間', () => {
    expect(particleCount(100, 100, 8000)).toBe(2000)
    expect(particleCount(4000, 4000, 8000)).toBe(8000)
  })
})
