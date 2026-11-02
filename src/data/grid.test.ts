import { describe, expect, it } from 'vitest'
import { decodeI16, fmtLon, isLand, normLon, sample } from './grid'
import type { GridMeta } from './types'

const g: GridMeta = { width: 3, height: 2, lon0: 179, lat0: 0, dlon: 1, dlat: 1, bounds: [178.5, -0.5, 181.5, 1.5] }
// 列 0（lat 0）：179, 180, 181；列 1（lat 1）
const f = new Float32Array([0, 10, 20, 100, NaN, 120])

describe('grid', () => {
  it('normLon 把西經轉成 0–360', () => {
    expect(normLon(-150)).toBe(210)
    expect(normLon(170)).toBe(170)
    expect(normLon(370)).toBe(10)
  })
  it('fmtLon 顯示東西經', () => {
    expect(fmtLon(210, 0)).toBe('150°W')
    expect(fmtLon(120.5, 1)).toBe('120.5°E')
  })
  it('sample 在格心回傳原值、跨換日線內插', () => {
    expect(sample(g, f, 179, 0)).toBe(0)
    expect(sample(g, f, 179.5, 0)).toBeCloseTo(5)
    expect(sample(g, f, -179.5, 0)).toBeCloseTo(15) // = 180.5
  })
  it('sample 碰到陸地或出界回傳 NaN', () => {
    expect(sample(g, f, 180, 0.5)).toBeNaN()
    expect(sample(g, f, 175, 0)).toBeNaN()
  })
  it('isLand 用最近格判斷', () => {
    expect(isLand(g, f, 180, 1)).toBe(true)
    expect(isLand(g, f, 179, 0)).toBe(false)
    expect(isLand(g, f, 0, 0)).toBe(true)
  })
  it('decodeI16 還原數值與 nodata', () => {
    const out = decodeI16(new Int16Array([2850, -32768]).buffer, 0.01, -32768)
    expect(out[0]).toBeCloseTo(28.5)
    expect(out[1]).toBeNaN()
  })
})
