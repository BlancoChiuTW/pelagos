// 共用狀態（TECH_SPEC §9）。元件一律用 selector 取值：useStore(s => s.layers.sst)
import { create } from 'zustand'
import type { Epoch } from './data/types'

export type LayerKey = 'sst' | 'anomaly' | 'currents' | 'buoys' | 'others' | 'fleet' | 'hotspot' | 'track'
export type OthersCount = 10000 | 50000 | 100000
export type Speed = 1 | 10 | 60
export type FxQuality = 'high' | 'low'

const HOUR = 3_600_000
const loadNow = Math.floor(Date.now() / HOUR) * HOUR // SIM_NOW：取整到小時（TECH_SPEC §8.1）

export interface AppState {
  layers: Record<LayerKey, boolean>
  othersCount: OthersCount
  selectedVesselId: string | null
  time: { now: Epoch; cursor: Epoch; playing: boolean; speed: Speed }
  online: boolean
  intro: 'pending' | 'playing' | 'done'
  /** 開機序列進度：0 全暗 → 1 海溫 → 2 洋流 → 3 浮標 → 4 船隊 → 5 HUD（X01） */
  introStage: number
  tour: { active: boolean; step: number }
  fx: { quality: FxQuality; auto: boolean; buoyMode: 'points' | 'columns' }

  toggleLayer: (k: LayerKey) => void
  setLayer: (k: LayerKey, on: boolean) => void
  setOthersCount: (n: OthersCount) => void
  selectVessel: (id: string | null) => void
  setCursor: (t: Epoch) => void
  play: () => void
  pause: () => void
  setSpeed: (s: Speed) => void
  setOnline: (on: boolean) => void
  setIntro: (s: AppState['intro']) => void
  setIntroStage: (n: number) => void
  setTour: (t: Partial<AppState['tour']>) => void
  setFx: (f: Partial<AppState['fx']>) => void
}

export const useStore = create<AppState>()((set) => ({
  layers: { sst: true, anomaly: false, currents: true, buoys: true, others: true, fleet: true, hotspot: false, track: true },
  othersCount: 10000,
  selectedVesselId: null,
  time: { now: loadNow, cursor: loadNow, playing: false, speed: 10 },
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  intro: 'pending',
  introStage: 0,
  tour: { active: false, step: 0 },
  fx: { quality: 'high', auto: true, buoyMode: 'points' },

  toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
  setLayer: (k, on) => set((s) => ({ layers: { ...s.layers, [k]: on } })),
  setOthersCount: (n) => set({ othersCount: n }),
  selectVessel: (id) => set({ selectedVesselId: id }),
  setCursor: (t) => set((s) => ({ time: { ...s.time, cursor: Math.min(t, s.time.now) } })),
  play: () => set((s) => ({ time: { ...s.time, playing: true } })),
  pause: () => set((s) => ({ time: { ...s.time, playing: false } })),
  setSpeed: (speed) => set((s) => ({ time: { ...s.time, speed } })),
  setOnline: (online) => set({ online }),
  setIntro: (intro) => set({ intro }),
  setIntroStage: (introStage) => set({ introStage }),
  setTour: (t) => set((s) => ({ tour: { ...s.tour, ...t } })),
  setFx: (f) => set((s) => ({ fx: { ...s.fx, ...f } })),
}))
