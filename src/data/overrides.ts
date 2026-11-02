// 使用者資料（TECH_SPEC §19.2）：主檔編輯、手動事件、已處理警示、匯入圖層。存 IndexedDB，重新整理後仍在。
import { create } from 'zustand'
import { get, set as idbSet } from 'idb-keyval'
import type { FleetSnapshot, TripEvent } from './types'
import type { VesselProfile } from '../sim/profile'

export interface ImportLayer { id: string; name: string; createdAt: number; points: { lon: number; lat: number; label: string; value?: number }[] }

interface Overrides {
  loaded: boolean
  profiles: Record<string, Partial<VesselProfile>>
  events: TripEvent[]
  ack: Record<string, true>
  imports: ImportLayer[]
  saveProfile: (id: string, p: Partial<VesselProfile>) => void
  addEvent: (e: TripEvent) => void
  setAck: (id: string, on: boolean) => void
  addImport: (l: ImportLayer) => void
  removeImport: (id: string) => void
  reset: () => void
}

const KEY = 'pelagos-overrides-v1'
type Persisted = Pick<Overrides, 'profiles' | 'events' | 'ack' | 'imports'>
const EMPTY: Persisted = { profiles: {}, events: [], ack: {}, imports: [] }

export const useOverrides = create<Overrides>()((set) => ({
  loaded: false,
  ...EMPTY,
  saveProfile: (id, p) => set((s) => ({ profiles: { ...s.profiles, [id]: { ...s.profiles[id], ...p } } })),
  addEvent: (e) => set((s) => ({ events: [...s.events, e] })),
  setAck: (id, on) =>
    set((s) => {
      const ack = { ...s.ack }
      if (on) ack[id] = true
      else delete ack[id]
      return { ack }
    }),
  addImport: (l) => set((s) => ({ imports: [...s.imports, l] })),
  removeImport: (id) => set((s) => ({ imports: s.imports.filter((x) => x.id !== id) })),
  reset: () => set({ ...EMPTY }),
}))

// 啟動時讀回，之後每次變動寫入
get<Persisted>(KEY)
  .then((v) => useOverrides.setState({ ...EMPTY, ...(v ?? {}), loaded: true }))
  .catch(() => useOverrides.setState({ loaded: true }))
useOverrides.subscribe((s) => {
  if (!s.loaded) return
  const { profiles, events, ack, imports } = s
  idbSet(KEY, { profiles, events, ack, imports }).catch(() => {})
})

/** 模擬快照＋使用者新增事件 → 合併後的快照（新增的下網事件同時更新航次摘要） */
export function mergeSnapshot(base: FleetSnapshot, events: TripEvent[]): FleetSnapshot {
  if (!events.length) return base
  const trips = base.trips.map((t) => {
    const mine = events.filter((e) => e.tripId === t.id)
    if (!mine.length) return t
    const sets = mine.filter((e) => e.type === 'set')
    return { ...t, summary: { ...t.summary, sets: t.summary.sets + sets.length, catchTons: Math.round(t.summary.catchTons + sets.reduce((a, e) => a + (e.detail.catchTons ?? 0), 0)) } }
  })
  return { ...base, trips, events: [...base.events, ...events].sort((a, b) => a.at - b.at) }
}
