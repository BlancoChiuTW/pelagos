// 海溫／海溫異常（F02、F15）：用 MapLibre 原生 image source＋raster layer，
// 插在第一個文字標籤圖層之前，讓地名浮在海溫上面。
// 海溫網格 0.5°，海岸是方塊狀 → 再蓋一層 Natural Earth 10m 陸地（底圖同色）＋淡青色海岸線。
import type * as maplibregl from 'maplibre-gl'
import { dataUrl } from '../data/DataSource'
import type { GridMeta } from '../data/types'

/** 與 CARTO Dark Matter 的 background 同色 */
const LAND_COLOR = '#080b10'

const RASTERS = { sst: 'sst.png', anomaly: 'anom.png' } as const
export type RasterKey = keyof typeof RASTERS

function firstSymbolLayer(map: maplibregl.Map): string | undefined {
  return map.getStyle().layers.find((l) => l.type === 'symbol')?.id
}

/** 底圖重新上色（v3 配色）：深海軍藍的海、近黑的陸地、壓暗的地名與國界 */
function recolorBasemap(map: maplibregl.Map) {
  const set = (id: string, prop: Parameters<maplibregl.Map['setPaintProperty']>[1], v: string) => map.getLayer(id) && map.setPaintProperty(id, prop, v)
  set('background', 'background-color', LAND_COLOR)
  set('water', 'fill-color', '#0a1622')
  for (const l of map.getStyle().layers) {
    if (l.type === 'symbol') {
      map.setPaintProperty(l.id, 'text-color', 'rgba(200,215,230,0.55)')
      map.setPaintProperty(l.id, 'text-halo-color', 'rgba(0,0,0,0.8)')
    } else if (l.type === 'line' && /boundary|admin/.test(l.id)) map.setPaintProperty(l.id, 'line-color', 'rgba(140,160,180,0.25)')
  }
}

export function mountOceanRasters(map: maplibregl.Map, grid: GridMeta) {
  recolorBasemap(map)
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
      // minzoom：高空時隱藏，否則看得到 land.geojson 的裁切邊框
      { id: 'pelagos-coast', type: 'line', source: 'pelagos-land', minzoom: 2.4, paint: { 'line-color': 'rgba(100,210,255,0.22)', 'line-width': 0.6 } },
      before,
    )
  }
}

/** 開關用透明度補間，不用 visibility（才有淡入淡出） */
export function setRasterVisible(map: maplibregl.Map, key: RasterKey, on: boolean, opacity = 0.55) {
  const id = `pelagos-${key}`
  if (map.getLayer(id)) map.setPaintProperty(id, 'raster-opacity', on ? opacity : 0)
}
