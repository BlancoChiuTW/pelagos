import { describe, expect, it } from 'vitest'
import { daysToFadClosure, vdsRemaining } from './alerts'

describe('alerts', () => {
  it('FAD 禁用期倒數：11/3 → 隔年 7/1 共 240 天', () => {
    expect(daysToFadClosure(Date.UTC(2026, 10, 3))).toBe(240)
    expect(daysToFadClosure(Date.UTC(2026, 5, 30))).toBe(1)
    expect(daysToFadClosure(Date.UTC(2026, 6, 1, 1))).toBe(365)
  })
  it('入漁天數固定、在 3–60 之間', () => {
    expect(vdsRemaining('PS101')).toBe(vdsRemaining('PS101'))
    for (let i = 101; i <= 130; i++) {
      const n = vdsRemaining(`PS${i}`)
      expect(n).toBeGreaterThanOrEqual(3)
      expect(n).toBeLessThanOrEqual(60)
    }
  })
})
