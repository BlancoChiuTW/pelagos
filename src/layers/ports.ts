// 港口與停靠站（GFW 進港事件）：錨形徽章（戰略地圖表現）
//   顏色：青＝藍潮常用港、琥珀＝轉載樞紐（運搬船進港占多數）、淡灰＝其他
//   大小：依 90 天進港次數分三級；拉遠時小港縮成點、只標常用港與大港
import { IconLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import type { Port } from '../data/types'
import { HOME_PORT, TRANSSHIP_PORTS } from '../sim/geo'

const OURS = new Set([HOME_PORT, ...TRANSSHIP_PORTS].map((p) => p.name.toLowerCase()).concat(['kaohsiung']))
export const isOurPort = (p: Port) => [...OURS].some((n) => p.name.toLowerCase().startsWith(n))
/** 轉載樞紐：運搬船進港占一半以上且至少 5 次 */
export const isHub = (p: Port) => p.carrier >= 5 && p.carrier / Math.max(1, p.visits) >= 0.5
const tier = (p: Port) => (p.visits >= 100 ? 3 : p.visits >= 25 ? 2 : 1)

type RGBA = [number, number, number, number]
const color = (p: Port): RGBA => (isOurPort(p) ? [100, 210, 255, 255] : isHub(p) ? [255, 179, 64, 245] : [215, 222, 230, 200])

// 錨形徽章（白色，mask 上色）：外圈＋錨
const ANCHOR = {
  url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="28" stroke-width="4"/><circle cx="32" cy="18" r="4.5" stroke-width="4"/><path d="M32 22.5V48M23 30h18M17 38c2 8 8 11 15 11s13-3 15-11" stroke-width="4.5"/><path d="M14 38l3-4 4 3M50 38l-3-4-4 3" stroke-width="4"/></svg>`)}`,
  width: 64, height: 64, mask: true,
}

export function createPortLayers(all: Port[], zoom: number) {
  // 拉遠只畫大港、轉載樞紐與常用港，避免東亞沿岸數百個漁港糊成一片
  const minVisits = zoom < 4 ? 60 : zoom < 5 ? 15 : 0
  const ports = all.filter((p) => isOurPort(p) || isHub(p) || p.visits >= minVisits)
  const badge = ports.filter((p) => zoom >= 4.2 || isOurPort(p) || isHub(p) || tier(p) === 3)
  const dots = ports.filter((p) => !badge.includes(p))
  const size = (p: Port) => [0, 15, 19, 24][tier(p)] + (isOurPort(p) ? 3 : 0)
  const labeled = ports.filter((p) => isOurPort(p) || (zoom >= 5 ? true : zoom >= 4 ? isHub(p) || tier(p) === 3 : false))
  return [
    new ScatterplotLayer<Port>({
      id: 'ports-dots', data: dots, getPosition: (p) => [p.lon, p.lat], getRadius: 2.5, radiusUnits: 'pixels',
      getFillColor: [215, 222, 230, 120], pickable: true,
    }),
    // 深色底盤襯出徽章
    new ScatterplotLayer<Port>({
      id: 'ports-backing', data: badge, getPosition: (p) => [p.lon, p.lat], getRadius: (p) => size(p) / 2, radiusUnits: 'pixels',
      getFillColor: [8, 16, 26, 220], pickable: false,
    }),
    new IconLayer<Port>({
      id: 'ports', data: badge, getPosition: (p) => [p.lon, p.lat], getIcon: () => ANCHOR, getSize: size, sizeUnits: 'pixels',
      getColor: color, pickable: true,
    }),
    new TextLayer<Port>({
      id: 'ports-labels', data: labeled, getPosition: (p) => [p.lon, p.lat], getText: (p) => p.name,
      getPixelOffset: (p) => [size(p) / 2 + 6, 0], getSize: 11, getColor: (p) => { const c = color(p); return [c[0], c[1], c[2], 230] },
      getTextAnchor: 'start', getAlignmentBaseline: 'center', background: true, getBackgroundColor: [8, 16, 26, 170], backgroundPadding: [4, 2],
      fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", sans-serif', characterSet: 'auto',
    }),
  ]
}
