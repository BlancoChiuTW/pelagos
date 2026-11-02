import { describe, expect, it } from 'vitest'
import { guessMapping, parseCsv, parseGeoJson } from './importer'

describe('importer', () => {
  it('CSV 解析含引號欄位', () => {
    const t = parseCsv('name,lat,lon\n"A, 1",1.5,160\nB,2,170\n')
    expect(t.columns).toEqual(['name', 'lat', 'lon'])
    expect(t.rows[0]).toEqual(['A, 1', '1.5', '160'])
  })
  it('GeoJSON Point 轉表格', () => {
    const t = parseGeoJson(JSON.stringify({ features: [{ geometry: { type: 'Point', coordinates: [160, 5] }, properties: { name: 'X' } }] }))
    expect(t.rows[0]).toEqual(['160', '5', 'X'])
  })
  it('猜欄位對應', () => {
    expect(guessMapping(['vessel', 'report_time_utc', 'latitude', 'longitude', 'speed_kn'])).toEqual({ lon: 3, lat: 2, label: 0, value: 4 })
  })
})
