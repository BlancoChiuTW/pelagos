// 港口與停靠站（GFW 進港事件）：圓圈大小＝90 天進港次數；藍潮常用轉載港另標強調色
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import type { Port } from '../data/types'
import { HOME_PORT, TRANSSHIP_PORTS } from '../sim/geo'

const OURS = new Set([HOME_PORT, ...TRANSSHIP_PORTS].map((p) => p.name.toLowerCase()).concat(['kaohsiung']))
export const isOurPort = (p: Port) => [...OURS].some((n) => p.name.toLowerCase().startsWith(n))
const r = (p: Port) => Math.min(16, 3 + Math.sqrt(p.visits) * 0.75)

export function createPortLayers(all: Port[], zoom: number) {
  // 依縮放分級：拉遠只畫大港與藍潮常用港，避免東亞沿岸數百個漁港糊成一片
  const minVisits = zoom < 4 ? 60 : zoom < 5 ? 15 : 0
  const ports = all.filter((p) => isOurPort(p) || p.visits >= minVisits)
  const labeled = ports.filter((p, i) => isOurPort(p) || (zoom >= 5 ? i < 120 : zoom >= 4 ? i < 8 : false))
  return [
    new ScatterplotLayer<Port>({
      id: 'ports',
      data: ports,
      getPosition: (p) => [p.lon, p.lat],
      getRadius: r,
      radiusUnits: 'pixels',
      filled: true,
      getFillColor: (p) => (isOurPort(p) ? [100, 210, 255, 90] : [235, 235, 245, 40]),
      stroked: true,
      getLineColor: (p) => (isOurPort(p) ? [100, 210, 255, 255] : [235, 235, 245, 150]),
      getLineWidth: (p) => (isOurPort(p) ? 1.8 : 1),
      lineWidthUnits: 'pixels',
      pickable: true,
    }),
    new TextLayer<Port>({
      id: 'ports-labels',
      data: labeled,
      getPosition: (p) => [p.lon, p.lat],
      getText: (p) => p.name,
      getPixelOffset: (p) => [r(p) + 5, 0],
      getSize: 11,
      getColor: (p) => (isOurPort(p) ? [100, 210, 255, 240] : [220, 225, 235, 190]),
      getTextAnchor: 'start',
      getAlignmentBaseline: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", sans-serif',
      characterSet: 'auto',
    }),
  ]
}
