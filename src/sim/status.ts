// 由船位推導船隻狀態（TECH_SPEC §4 VesselStatus）
// 圍網船：當地白天（05–18）在漁場搜魚／下網＝作業中，夜間＝漂流；長距離直航（> 12 kn）＝航行中
// 運搬船：在港／航行中
import type { Epoch, Position, VesselStatus, VesselType } from '../data/types'
import { distNm, HOUR, localHour, TRANSSHIP_PORTS } from './geo'

export function statusOf(track: Position[], now: Epoch, type: VesselType = 'purse_seiner'): VesselStatus {
  const last = track.at(-1)
  if (!last || now - last.at > 2 * HOUR) return 'signal_lost'
  if (last.sog < 1 && TRANSSHIP_PORTS.some((p) => distNm(last.lon, last.lat, p.lon, p.lat) < 5)) return 'in_port'
  if (type === 'reefer') return last.sog < 1 ? 'drifting' : 'transit'
  if (last.sog > 12) return 'transit'
  const lh = localHour(last.at, last.lon)
  return lh >= 5 && lh < 18 ? 'fishing' : 'drifting'
}

export const STATUS_LABEL: Record<VesselStatus, string> = {
  fishing: '作業中',
  transit: '航行中',
  drifting: '漂流',
  in_port: '在港',
  signal_lost: '訊號中斷',
}
