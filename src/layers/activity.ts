// 可疑活動（GFW 事件）：地圖標記針＋彩色文字標籤
//   橘：疑似海上轉載（兩船並排＋雙向箭頭）  藍：海上加油（油滴）
//   琥珀：運搬船徘徊（繞圈箭頭）            紅：AIS 刻意關閉（訊號＋斜線）
import { IconLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import type { ActivityEvent } from '../data/types'

// 地圖標記針（水滴形，針尖＝事件位置）：針身＝事件色、白色符號；港口用圓形錨徽章，一看就分得出「地點」與「事件」
const GLYPH = {
  transshipment: '<rect x="16" y="17" width="10" height="30" rx="5" stroke-width="4.5"/><rect x="38" y="17" width="10" height="30" rx="5" stroke-width="4.5"/><path d="M29 27h6l-2.5-2.5M35 37h-6l2.5 2.5" stroke-width="4"/>',
  bunkering: '<path d="M32 13c0 0-12 14-12 23a12 12 0 0 0 24 0c0-9-12-23-12-23Z" stroke-width="4.5"/>',
  loitering: '<path d="M45 27a14 14 0 1 0 1 9" stroke-width="5"/><path d="M46 18v10h-10" stroke-width="5"/>',
  gap: '<path d="M32 47V35M23 29a12 12 0 0 1 18 0M17 22a20 20 0 0 1 30 0" stroke-width="4.5"/><path d="M17 47 47 17" stroke-width="5"/>',
}
const FILL = { transshipment: '#ff9f0a', bunkering: '#4fb8e6', loitering: '#e0a93a', gap: '#ff453a' }
const pin = (k: keyof typeof GLYPH) => ({
  url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60"><path d="M24 58S6 39 6 23a18 18 0 0 1 36 0c0 16-18 35-18 35Z" fill="${FILL[k]}" stroke="#08101a" stroke-width="2"/><g transform="translate(10 9) scale(.4375)" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</g></svg>`)}`,
  width: 48, height: 60, anchorY: 60, mask: false,
})
const ICON = { transshipment: pin('transshipment'), bunkering: pin('bunkering'), loitering: pin('loitering'), gap: pin('gap') }
type Key = keyof typeof ICON
const key = (e: ActivityEvent): Key => (e.kind === 'encounter' ? (e.encounterType === 'transshipment' ? 'transshipment' : 'bunkering') : e.kind)
type RGBA = [number, number, number, number]
const COLOR: Record<Key, RGBA> = {
  transshipment: [255, 159, 10, 255],
  bunkering: [100, 210, 255, 245],
  loitering: [255, 204, 102, 220],
  gap: [255, 69, 58, 235],
}
const SIZE: Record<Key, number> = { transshipment: 32, bunkering: 28, loitering: 22, gap: 22 } // 標記針高度（px）

/** 徽章旁的文字標籤（不用查圖例就看懂） */
const TAG: Record<Key, string> = { transshipment: '轉載', bunkering: '加油', loitering: '徘徊', gap: 'AIS 斷訊' }

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
    // 文字標籤：相遇在 zoom ≥ 3.5 顯示，徘徊／AIS 斷訊數量多，zoom ≥ 5.5 才顯示
    new TextLayer<ActivityEvent>({
      id: 'gfw-activity-tags',
      data: badges.filter((e) => (e.kind === 'encounter' ? zoom >= 3.5 : zoom >= 5.5)),
      getPosition: (e) => [e.lon, e.lat],
      getText: (e) => TAG[key(e)],
      getPixelOffset: (e) => [SIZE[key(e)] * k * 0.42 + 4, -SIZE[key(e)] * k * 0.62], // 針頭右側
      getSize: 11,
      getColor: [8, 16, 26, 255],
      getTextAnchor: 'start',
      getAlignmentBaseline: 'center',
      fontWeight: 600,
      background: true,
      getBackgroundColor: (e) => { const c = COLOR[key(e)]; return [c[0], c[1], c[2], 235] },
      backgroundPadding: [5, 2],
      fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", sans-serif',
      characterSet: 'auto',
      updateTriggers: { getPixelOffset: k },
    }),
    new IconLayer<ActivityEvent>({
      id: 'gfw-activity', data: badges, getPosition: (e) => [e.lon, e.lat], getIcon: (e) => ICON[key(e)],
      getSize: (e) => SIZE[key(e)] * k, sizeUnits: 'pixels', pickable: true,
      updateTriggers: { getSize: k },
    }),
  ]
}
