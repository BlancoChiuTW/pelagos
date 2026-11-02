// 模擬用的地理工具與港口表（純函式）
import type { Lat, Lon } from '../data/types'

export const HOUR = 3_600_000
export const DAY = 24 * HOUR
const NM_PER_DEG = 60

/** 從 (lon,lat) 往 heading（度，北=0 順時針）走 nm 海里 */
export function move(lon: Lon, lat: Lat, heading: number, nm: number): [Lon, Lat] {
  const h = (heading * Math.PI) / 180
  const dlat = (nm * Math.cos(h)) / NM_PER_DEG
  const dlon = (nm * Math.sin(h)) / (NM_PER_DEG * Math.max(Math.cos((lat * Math.PI) / 180), 0.2))
  return [lon + dlon, lat + dlat]
}

/** 兩點方位角（度） */
export function bearing(lon1: Lon, lat1: Lat, lon2: Lon, lat2: Lat): number {
  const dx = (lon2 - lon1) * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180)
  const dy = lat2 - lat1
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
}

/** 兩點距離（海里，平面近似，夠模擬用） */
export function distNm(lon1: Lon, lat1: Lat, lon2: Lon, lat2: Lat): number {
  const dx = (lon2 - lon1) * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180)
  return Math.hypot(dx, lat2 - lat1) * NM_PER_DEG
}

/** 地方太陽時（小時，0–24） */
export function localHour(t: number, lon: Lon): number {
  const utc = (t % DAY) / HOUR
  return (((utc + lon / 15) % 24) + 24) % 24
}

export interface Port { name: string; lon: Lon; lat: Lat }
export const HOME_PORT: Port = { name: '高雄', lon: 120.27, lat: 22.6 }
/** 轉載港（TECH_SPEC §8.2）。座標刻意放在港外海面，避開 0.5° 陸地遮罩 */
export const TRANSSHIP_PORTS: Port[] = [
  { name: 'Pohnpei', lon: 158.3, lat: 7.1 },
  { name: 'Majuro', lon: 171.5, lat: 7.2 },
  { name: 'Tarawa', lon: 172.9, lat: 1.5 },
  { name: 'Honiara', lon: 160.0, lat: -9.2 },
]
