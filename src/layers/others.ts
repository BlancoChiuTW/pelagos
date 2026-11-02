// 周邊船隻（F04）：二進位屬性的點圖層。遠看縮成 1px 淡點，密度靠點的疏密呈現；近看 2px。
// 取捨紀錄：試過 zoom < 4 改 ScreenGridLayer 熱度格，疊在彩色海溫上像棋盤、反而難讀，所以放棄。
import { ScatterplotLayer } from '@deck.gl/layers'
import type { OthersFrame } from '../sim/useOthers'

export function createOthersLayer(f: OthersFrame, zoom: number) {
  const far = zoom < 4
  return new ScatterplotLayer({
    id: 'others-dots',
    data: { length: f.count, attributes: { getPosition: { value: f.positions, size: 2 } } },
    getRadius: far ? 1 : 1.8,
    radiusUnits: 'pixels',
    getFillColor: far ? [215, 230, 240, 110] : [190, 210, 222, 160],
    updateTriggers: { getRadius: far, getFillColor: far },
  })
}
