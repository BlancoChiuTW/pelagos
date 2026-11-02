// 載入船隊快照，並依時間 t 算出每艘自家船的即時姿態與狀態
import { useEffect, useMemo, useState } from 'react'
import { dataSource } from './DataSource'
import type { Epoch, FleetSnapshot, OceanGrid, Position, Trip, Vessel, VesselStatus } from './types'
import { groupTracks, poseAt, type Pose } from '../sim/interp'
import { statusOf } from '../sim/status'

export interface FleetItem { vessel: Vessel; trip: Trip; track: Position[]; pose: Pose; status: VesselStatus }

export function useFleetSnapshot(grid: OceanGrid | null, now: Epoch): FleetSnapshot | null {
  const [snap, setSnap] = useState<FleetSnapshot | null>(null)
  useEffect(() => {
    if (!grid) return
    let alive = true
    dataSource.loadFleet(grid, now).then((s) => alive && setSnap(s))
    return () => {
      alive = false
    }
  }, [grid, now])
  return snap
}

export function useFleetItems(snap: FleetSnapshot | null, t: Epoch): FleetItem[] {
  const tracks = useMemo(() => (snap ? groupTracks(snap.positions) : new Map<string, Position[]>()), [snap])
  return useMemo(() => {
    if (!snap) return []
    const out: FleetItem[] = []
    for (const vessel of snap.vessels) {
      const track = tracks.get(vessel.id) ?? []
      const trip = snap.trips.find((x) => x.vesselId === vessel.id)
      // 回放時（t 在過去）只看 t 之前的船位來判斷狀態
      const seen = track.filter((p) => p.at <= t)
      const pose = poseAt(seen.length ? seen : track, t)
      if (!pose || !trip) continue
      out.push({ vessel, trip, track, pose, status: statusOf(seen, t) })
    }
    return out
  }, [snap, tracks, t])
}
