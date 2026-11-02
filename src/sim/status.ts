// 由船位推導船隻狀態（TECH_SPEC §4 VesselStatus）
import type { Epoch, Position, VesselStatus } from '../data/types'
import { distNm, HOUR, localHour, TRANSSHIP_PORTS } from './geo'

export function statusOf(track: Position[], now: Epoch): VesselStatus {
  const last = track.at(-1)
  if (!last || now - last.at > 2 * HOUR) return 'signal_lost'
  if (last.sog < 1 && TRANSSHIP_PORTS.some((p) => distNm(last.lon, last.lat, p.lon, p.lat) < 5)) return 'in_port'
  const lh = localHour(last.at, last.lon)
  if (last.sog < 1 && lh >= 6 && lh < 9) return 'fishing'
  if (last.sog < 2) return 'drifting'
  return 'transit'
}

export const STATUS_LABEL: Record<VesselStatus, string> = {
  fishing: '作業中',
  transit: '航行中',
  drifting: '漂流',
  in_port: '在港',
  signal_lost: '訊號中斷',
}
