// 匯入圖層（M03）：橘色點＋名稱，和自家船隊區分
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import type { ImportLayer } from '../data/overrides'

type Pt = ImportLayer['points'][number]
export function createImportLayers(imports: ImportLayer[], zoom: number) {
  const pts = imports.flatMap((l) => l.points)
  return [
    new ScatterplotLayer<Pt>({ id: 'imports', data: pts, getPosition: (p) => [p.lon, p.lat], getRadius: 5, radiusUnits: 'pixels', getFillColor: [255, 159, 10, 230], stroked: true, getLineColor: [0, 0, 0, 160], getLineWidth: 1, lineWidthUnits: 'pixels', pickable: true }),
    new TextLayer<Pt>({
      id: 'imports-labels', data: zoom >= 4 ? pts.filter((p) => p.label) : [], getPosition: (p) => [p.lon, p.lat], getText: (p) => p.label,
      getPixelOffset: [0, 12], getSize: 11, getColor: [255, 200, 120, 240], characterSet: 'auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", sans-serif', getTextAnchor: 'middle', getAlignmentBaseline: 'top',
    }),
  ]
}
