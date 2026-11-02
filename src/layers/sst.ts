// 海溫／海溫異常（F02、F15）：用 MapLibre 原生 image source＋raster layer，
// 插在第一個文字標籤圖層之前，讓地名浮在海溫上面。
// 海溫網格 0.5°，海岸是方塊狀 → 再蓋一層 Natural Earth 10m 陸地（底圖同色）＋淡青色海岸線。
import type * as maplibregl from 'maplibre-gl'
import { dataUrl } from '../data/DataSource'
import type { GridMeta } from '../data/types'

/** 與 CARTO Dark Matter 的 background 同色 */
const LAND_COLOR = '#0e0e0e'

const RASTERS = { sst: 'sst.png', anomaly: 'anom.png' } as const
export type RasterKey = keyof typeof RASTERS

function firstSymbolLayer(map: maplibregl.Map): string | undefined {
  return map.getStyle().layers.find((l) => l.type === 'symbol')?.id
}

export function mountOceanRasters(map: maplibregl.Map, grid: GridMeta) {
  const [w, s, e, n] = grid.bounds
  const before = firstSymbolLayer(map)
  for (const [key, file] of Object.entries(RASTERS)) {
    const id = `pelagos-${key}`
    if (map.getSource(id)) continue
    map.addSource(id, {
      type: 'image',
      url: dataUrl(file),
      coordinates: [[w, n], [e, n], [e, s], [w, s]],
    })
    map.addLayer(
      {
        id,
        type: 'raster',
        source: id,
        paint: { 'raster-opacity': 0, 'raster-resampling': 'linear', 'raster-fade-duration': 0, 'raster-opacity-transition': { duration: 600 } },
      },
      before,
    )
  }
  if (!map.getSource('pelagos-land')) {
    map.addSource('pelagos-land', { type: 'geojson', data: dataUrl('land.geojson') })
    map.addLayer({ id: 'pelagos-land', type: 'fill', source: 'pelagos-land', paint: { 'fill-color': LAND_COLOR } }, before)
    map.addLayer(
      { id: 'pelagos-coast', type: 'line', source: 'pelagos-land', paint: { 'line-color': 'rgba(57,213,255,0.35)', 'line-width': 0.7 } },
      before,
    )
  }
}

/** 開關用透明度補間，不用 visibility（才有淡入淡出） */
export function setRasterVisible(map: maplibregl.Map, key: RasterKey, on: boolean, opacity = 0.8) {
  const id = `pelagos-${key}`
  if (map.getLayer(id)) map.setPaintProperty(id, 'raster-opacity', on ? opacity : 0)
}
