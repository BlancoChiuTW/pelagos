import { useEffect, useState } from 'react'
import { dataSource } from './DataSource'
import type { FishingEffort, OceanGrid, PortStats } from './types'

export type Loadable<T> = { state: 'loading' } | { state: 'ok'; data: T } | { state: 'error'; error: string }

/** 載入海況網格；失敗不丟例外，交給畫面顯示（PRD 穩定性要求） */
export function useOcean(): Loadable<OceanGrid> {
  const [v, setV] = useState<Loadable<OceanGrid>>({ state: 'loading' })
  useEffect(() => {
    let alive = true
    dataSource
      .loadOcean()
      .then((data) => alive && setV({ state: 'ok', data }))
      .catch((e: unknown) => alive && setV({ state: 'error', error: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
    }
  }, [])
  return v
}

/** 周邊漁船活動（GFW）；載入失敗只關掉這層 */
export function useFishingEffort(): FishingEffort | null {
  const [v, setV] = useState<FishingEffort | null>(null)
  useEffect(() => {
    dataSource.loadFishingEffort().then(setV).catch(() => setV(null))
  }, [])
  return v
}

export function usePorts(): PortStats | null {
  const [v, setV] = useState<PortStats | null>(null)
  useEffect(() => {
    dataSource.loadPorts().then(setV).catch(() => setV(null))
  }, [])
  return v
}
