// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { encodeFlux, encodeNaf, encodeVendorA, encodeVendorB, parseBuoy, parseFlux, parseNaf } from './formats'

const at = Date.UTC(2026, 10, 2, 22, 0)
describe('介面格式', () => {
  it('NAF 往返：西經轉回 0–360', () => {
    const raw = encodeNaf({ seq: 12, regNo: 'CT7-1234', name: '藍潮 101', lat: 5.123, lon: 200.5, sog: 9.7, cog: 120, at })
    const r = parseNaf(raw)
    expect(r.ok && r.fields.lon).toBeCloseTo(200.5)
    expect(r.ok && r.fields.sogKn).toBe(9.7)
  })
  it('NAF 錯誤欄位會被擋下', () => {
    expect(parseNaf('//SR//IR/X//LT/N5//ER//').ok).toBe(false)
  })
  it('兩家浮標廠商格式都正規化成噸', () => {
    const b = { id: 'B1', at, lat: -1.5, lon: 190, tons: 23.4 }
    const a = parseBuoy(encodeVendorA(b)), c = parseBuoy(encodeVendorB(b))
    expect(a.ok && a.fields.biomassTons).toBeCloseTo(23.4)
    expect(c.ok && c.fields.biomassTons).toBeCloseTo(23.4)
    expect(c.ok && c.fields.lon).toBeCloseTo(190)
  })
  it('FLUX 解析出漁獲總噸數', () => {
    const r = parseFlux(encodeFlux({ reportId: 'u1', regNo: 'CT7-1', name: 'A', at, lat: 2, lon: 170, catches: [{ species: 'SKJ', kg: 18000 }, { species: 'YFT', kg: 4500 }] }))
    expect(r.ok && r.fields.catchTons).toBe(22.5)
  })
})
