// 經濟海域（EEZ）與 PNA 入漁區：MapLibre 原生 geojson 圖層（插在地名之下），可由圖層選單切換
// 資料：Marine Regions（Flanders Marine Institute，CC BY 4.0），etl/fetch_eez.py
import type * as maplibregl from 'maplibre-gl'
import { dataUrl } from '../data/DataSource'

const IDS = ['pelagos-pna-fill', 'pelagos-pna-line', 'pelagos-eez-lines', 'pelagos-pna-labels']

interface EezJson {
  boundaries: GeoJSON.FeatureCollection
  pna: GeoJSON.FeatureCollection<GeoJSON.Geometry, { name: string; labelLon: number; labelLat: number }>
}

export async function mountEez(map: maplibregl.Map) {
  if (map.getSource('pelagos-eez')) return
  const d = (await (await fetch(dataUrl('eez.json'))).json()) as EezJson
  if (map.getSource('pelagos-eez')) return
  const labels: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: d.pna.features.map((f) => ({ type: 'Feature', properties: { name: f.properties.name }, geometry: { type: 'Point', coordinates: [f.properties.labelLon, f.properties.labelLat] } })),
  }
  map.addSource('pelagos-eez', { type: 'geojson', data: d.boundaries })
  map.addSource('pelagos-pna', { type: 'geojson', data: d.pna })
  map.addSource('pelagos-pna-pt', { type: 'geojson', data: labels })
  const before = map.getStyle().layers.find((l) => l.type === 'symbol')?.id
  // 沿用底圖的字型（中文由 MapLibre 用本機字型繪製）
  const sym = map.getStyle().layers.find((l) => l.type === 'symbol') as { layout?: Record<string, unknown> } | undefined
  const font = sym?.layout?.['text-font'] as string[] | undefined
  map.addLayer({ id: 'pelagos-pna-fill', type: 'fill', source: 'pelagos-pna', paint: { 'fill-color': '#64d2ff', 'fill-opacity': 0.06 } }, before)
  map.addLayer({ id: 'pelagos-pna-line', type: 'line', source: 'pelagos-pna', paint: { 'line-color': 'rgba(100,210,255,0.45)', 'line-width': 1 } }, before)
  map.addLayer({ id: 'pelagos-eez-lines', type: 'line', source: 'pelagos-eez', paint: { 'line-color': 'rgba(200,215,230,0.32)', 'line-width': 0.8, 'line-dasharray': [3, 3] } }, before)
  map.addLayer({
    id: 'pelagos-pna-labels', type: 'symbol', source: 'pelagos-pna-pt', minzoom: 2.8,
    layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-letter-spacing': 0.1, ...(font ? { 'text-font': font } : {}) },
    paint: { 'text-color': 'rgba(100,210,255,0.6)', 'text-halo-color': 'rgba(0,0,0,0.7)', 'text-halo-width': 1 },
  })
}

export function setEezVisible(map: maplibregl.Map, on: boolean) {
  for (const id of IDS) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none')
}
