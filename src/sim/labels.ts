// 事件與船型的顯示文字與顏色（HUD 與地圖共用）
import type { EventType, VesselType } from '../data/types'

export const EVENT_LABEL: Record<EventType, string> = {
  depart: '出港',
  set: '下網',
  deploy_buoy: '放浮標',
  transship: '轉載',
  port_call: '靠港',
  bunker: '加油',
  signal_lost: '訊號中斷',
}
export const EVENT_VAR: Record<EventType, string> = {
  depart: 'var(--accent)',
  set: 'var(--ok)',
  deploy_buoy: 'var(--text-dim)',
  transship: 'var(--warn)',
  port_call: 'var(--text)',
  bunker: 'var(--text-dim)',
  signal_lost: 'var(--alert)',
}
export const EVENT_RGB: Record<EventType, [number, number, number]> = {
  depart: [100, 210, 255],
  set: [48, 209, 88],
  deploy_buoy: [142, 142, 147],
  transship: [255, 159, 10],
  port_call: [235, 235, 245],
  bunker: [142, 142, 147],
  signal_lost: [255, 69, 58],
}
export const VESSEL_TYPE_LABEL: Record<VesselType, string> = { purse_seiner: '圍網船', reefer: '冷凍運搬船' }

export const fmtTime = (t: number) =>
  new Date(t).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
export const fmtDate = (t: number) => new Date(t).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' })
