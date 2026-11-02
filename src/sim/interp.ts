// 依時間取船位：每小時一點之間線性內插；超過最後一點最多外推 1 小時（訊號中斷的船不外推）
import type { Epoch, Position } from '../data/types'
import { HOUR, move } from './geo'

export interface Pose { lon: number; lat: number; cog: number; sog: number; at: Epoch; stale: boolean }

export function poseAt(track: Position[], t: Epoch): Pose | null {
  if (!track.length) return null
  const first = track[0]
  if (t <= first.at) return { ...first, stale: false }
  const last = track[track.length - 1]
  if (t >= last.at) {
    const dt = (t - last.at) / HOUR
    if (dt > 2) return { ...last, stale: true } // 訊號中斷：停在最後位置
    const [lon, lat] = move(last.lon, last.lat, last.cog, last.sog * Math.min(dt, 1))
    return { lon, lat, cog: last.cog, sog: last.sog, at: t, stale: false }
  }
  // 每小時一點 → 直接算索引
  const i = Math.min(track.length - 2, Math.floor((t - first.at) / HOUR))
  const a = track[i]
  const b = track[i + 1]
  const f = (t - a.at) / (b.at - a.at)
  return { lon: a.lon + (b.lon - a.lon) * f, lat: a.lat + (b.lat - a.lat) * f, cog: f < 0.5 ? a.cog : b.cog, sog: a.sog, at: t, stale: false }
}

/** 依 vesselId 分組（輸入已依時間排序） */
export function groupTracks(positions: Position[]): Map<string, Position[]> {
  const m = new Map<string, Position[]>()
  for (const p of positions) {
    const arr = m.get(p.vesselId)
    if (arr) arr.push(p)
    else m.set(p.vesselId, [p])
  }
  return m
}
