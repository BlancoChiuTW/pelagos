import type { VesselStatus } from '../data/types'
export const STATUS_VAR: Record<VesselStatus, string> = { fishing: 'var(--green)', transit: 'var(--tint)', drifting: 'var(--gray)', in_port: 'var(--label)', signal_lost: 'var(--red)' }
export const ago = (t: number, now: number) => {
  const m = Math.max(0, Math.round((now - t) / 60000))
  return m < 60 ? `${m} 分鐘前` : m < 1440 ? `${Math.floor(m / 60)} 小時前` : `${Math.floor(m / 1440)} 天前`
}
