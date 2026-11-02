import { useEffect, useState } from 'react'
import { dataSource } from './DataSource'
import type { OceanGrid } from './types'

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
