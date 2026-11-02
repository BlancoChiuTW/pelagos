// 可疑活動（GFW 事件）：地圖標記針（只用圖示；靠近的事件聚合，滑過看明細）
//   橘：疑似海上轉載（兩船並排＋雙向箭頭）  藍：海上加油（油滴）
//   琥珀：運搬船徘徊（繞圈箭頭）            紅：AIS 刻意關閉（訊號＋斜線）
import { IconLayer } from '@deck.gl/layers'
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
const SIZE: Record<Key, number> = { transshipment: 32, bunkering: 28, loitering: 24, gap: 24 } // 標記針高度（px）

export const ACTIVITY_LABEL = { encounter: '海上相遇', loitering: '運搬船徘徊', gap: 'AIS 刻意關閉' } as const

/** 聚合後的一根針：畫面上 CELL_PX 內的事件合併，顏色取最重要的類型（轉載 > 加油 > AIS 斷訊 > 徘徊） */
export interface ActivityCluster {
  lon: number
  lat: number
  key: Key
  counts: Record<Key, number>
  events: ActivityEvent[]
}
const CELL_PX = 36
const PRIORITY: Key[] = ['transshipment', 'bunkering', 'gap', 'loitering']

function cluster(events: ActivityEvent[], zoom: number): ActivityCluster[] {
  const cell = (CELL_PX * 360) / (512 * 2 ** zoom) // 這個縮放下 36px 約是幾度
  const groups = new Map<string, ActivityEvent[]>()
  for (const e of events) {
    const id = `${Math.floor(e.lon / cell)}:${Math.floor(e.lat / cell)}`
    const g = groups.get(id)
    if (g) g.push(e)
    else groups.set(id, [e])
  }
  return [...groups.values()].map((es) => {
    const counts = { transshipment: 0, bunkering: 0, loitering: 0, gap: 0 }
    for (const e of es) counts[key(e)]++
    return {
      lon: es.reduce((a, e) => a + e.lon, 0) / es.length,
      lat: es.reduce((a, e) => a + e.lat, 0) / es.length,
      key: PRIORITY.find((k) => counts[k] > 0) ?? 'loitering',
      counts,
      events: es,
    }
  })
}

export function createActivityLayers(events: ActivityEvent[], showGaps: boolean, zoom: number) {
  // 任何縮放都畫針（不再縮成小點而像消失）；靠近的事件聚合成一根針，避免疊圖看不清
  const clusters = cluster(events.filter((e) => e.kind !== 'gap' || showGaps), zoom)
  const k = zoom >= 5 ? 1.15 : zoom < 3 ? 0.85 : 1
  // 只用圖示不加文字（Blanco：文字太雜）；聚合件數用針的大小表示，滑過看明細
  const size = (c: ActivityCluster) => SIZE[c.key] * k * Math.min(1.45, 1 + (c.events.length - 1) * 0.08)
  return [
    new IconLayer<ActivityCluster>({
      id: 'gfw-activity', data: clusters, getPosition: (c) => [c.lon, c.lat], getIcon: (c) => ICON[c.key],
      getSize: size, sizeUnits: 'pixels', pickable: true, updateTriggers: { getSize: k },
    }),
  ]
}
