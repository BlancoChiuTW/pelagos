// 可疑活動（GFW 事件）：菱形＝海上相遇（橘：疑似轉載、藍：海上加油）、小圈＝運搬船徘徊、紅叉＝AIS 刻意關閉
import { IconLayer } from '@deck.gl/layers'
import type { ActivityEvent } from '../data/types'

const svg = (body: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${body}</svg>`)}`
const ICON = {
  encounter: { url: svg('<path d="M24 4 44 24 24 44 4 24Z" fill="#fff"/><path d="M24 15 33 24 24 33 15 24Z" fill="#000" fill-opacity="0"/>'), width: 48, height: 48, mask: true },
  loitering: { url: svg('<circle cx="24" cy="24" r="16" fill="none" stroke="#fff" stroke-width="6"/>'), width: 48, height: 48, mask: true },
  gap: { url: svg('<path d="M10 10 38 38M38 10 10 38" stroke="#fff" stroke-width="8" stroke-linecap="round"/>'), width: 48, height: 48, mask: true },
}
type RGBA = [number, number, number, number]
const color = (e: ActivityEvent): RGBA =>
  e.kind === 'encounter' ? (e.encounterType === 'transshipment' ? [255, 159, 10, 240] : [100, 210, 255, 230]) : e.kind === 'loitering' ? [255, 200, 90, 170] : [255, 69, 58, 200]

export const ACTIVITY_LABEL = { encounter: '海上相遇', loitering: '運搬船徘徊', gap: 'AIS 刻意關閉' } as const

export function createActivityLayer(events: ActivityEvent[], showGaps: boolean, zoom: number) {
  const data = events.filter((e) => e.kind !== 'gap' || showGaps)
  return new IconLayer<ActivityEvent>({
    id: 'gfw-activity',
    data,
    getPosition: (e) => [e.lon, e.lat],
    getIcon: (e) => ICON[e.kind],
    getSize: (e) => (e.kind === 'encounter' ? 13 : e.kind === 'loitering' ? 9 : 8) * (zoom >= 5 ? 1.3 : 1),
    sizeUnits: 'pixels',
    getColor: color,
    pickable: true,
    updateTriggers: { getSize: zoom >= 5 },
  })
}
