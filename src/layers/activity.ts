// 可疑活動（GFW 事件）：徽章圖示（和港口同一套語言：深色底盤＋外圈＋符號）
//   橘：疑似海上轉載（兩船並排＋雙向箭頭）  藍：海上加油（油滴）
//   琥珀：運搬船徘徊（繞圈箭頭）            紅：AIS 刻意關閉（訊號＋斜線）
import { IconLayer, ScatterplotLayer } from '@deck.gl/layers'
import type { ActivityEvent } from '../data/types'

const badge = (glyph: string) => ({
  url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="28" stroke-width="4"/>${glyph}</svg>`)}`,
  width: 64, height: 64, mask: true,
})
const ICON = {
  transshipment: badge('<rect x="16" y="17" width="10" height="30" rx="5" stroke-width="4"/><rect x="38" y="17" width="10" height="30" rx="5" stroke-width="4"/><path d="M29 27h6l-2.5-2.5M35 37h-6l2.5 2.5" stroke-width="3.5"/>'),
  bunkering: badge('<path d="M32 15c0 0-11 13-11 21a11 11 0 0 0 22 0c0-8-11-21-11-21Z" stroke-width="4"/><path d="M27 37a5 5 0 0 0 5 5" stroke-width="3.5"/>'),
  loitering: badge('<path d="M44 26a13 13 0 1 0 1 9" stroke-width="4.5"/><path d="M45 18v9h-9" stroke-width="4.5"/>'),
  gap: badge('<path d="M32 46V34M24 28a11 11 0 0 1 16 0M19 22a18 18 0 0 1 26 0" stroke-width="4"/><path d="M18 46 46 18" stroke-width="4.5"/>'),
}
type Key = keyof typeof ICON
const key = (e: ActivityEvent): Key => (e.kind === 'encounter' ? (e.encounterType === 'transshipment' ? 'transshipment' : 'bunkering') : e.kind)
type RGBA = [number, number, number, number]
const COLOR: Record<Key, RGBA> = {
  transshipment: [255, 159, 10, 255],
  bunkering: [100, 210, 255, 245],
  loitering: [255, 204, 102, 220],
  gap: [255, 69, 58, 235],
}
const SIZE: Record<Key, number> = { transshipment: 20, bunkering: 17, loitering: 14, gap: 14 }

export const ACTIVITY_LABEL = { encounter: '海上相遇', loitering: '運搬船徘徊', gap: 'AIS 刻意關閉' } as const

export function createActivityLayer(events: ActivityEvent[], showGaps: boolean, zoom: number) {
  // 拉遠時徘徊事件（數量多）縮成小點，只保留相遇徽章，避免雜訊
  const all = events.filter((e) => e.kind !== 'gap' || showGaps)
  const far = zoom < 4
  const badges = far ? all.filter((e) => e.kind === 'encounter') : all
  const dots = far ? all.filter((e) => e.kind !== 'encounter') : []
  const k = zoom >= 5 ? 1.25 : 1
  return [
    new ScatterplotLayer<ActivityEvent>({
      id: 'gfw-activity-dots', data: dots, getPosition: (e) => [e.lon, e.lat], getRadius: 2.5, radiusUnits: 'pixels',
      getFillColor: (e) => { const c = COLOR[key(e)]; return [c[0], c[1], c[2], 150] }, pickable: true,
    }),
    new ScatterplotLayer<ActivityEvent>({
      id: 'gfw-activity-backing', data: badges, getPosition: (e) => [e.lon, e.lat], getRadius: (e) => (SIZE[key(e)] * k) / 2, radiusUnits: 'pixels',
      getFillColor: [8, 16, 26, 225], updateTriggers: { getRadius: k },
    }),
    new IconLayer<ActivityEvent>({
      id: 'gfw-activity', data: badges, getPosition: (e) => [e.lon, e.lat], getIcon: (e) => ICON[key(e)],
      getSize: (e) => SIZE[key(e)] * k, sizeUnits: 'pixels', getColor: (e) => COLOR[key(e)], pickable: true,
      updateTriggers: { getSize: k },
    }),
  ]
}
