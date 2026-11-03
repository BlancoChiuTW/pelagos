import { useCallback, useEffect, useState } from 'react'
import { dataSource } from './DataSource'

export type Loadable<T> = { state: 'loading' } | { state: 'ok'; data: T } | { state: 'error'; error: string }
function useResource<T>(load: () => Promise<T>) {
  const [value, setValue] = useState<Loadable<T>>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt(n => n + 1), [])
  useEffect(() => {
    let alive = true
    setValue({ state: 'loading' })
    const timeout = setTimeout(() => {
      if (alive) { alive = false; setValue({ state: 'error', error: '連線逾時，請重試' }) }
    }, 20000)
    load().then(data => { if (alive) setValue({ state: 'ok', data }) })
      .catch((e: unknown) => { if (alive) setValue({ state: 'error', error: e instanceof Error ? e.message : String(e) }) })
      .finally(() => clearTimeout(timeout))
    return () => { alive = false; clearTimeout(timeout) }
  }, [load, attempt])
  return { ...value, retry }
}
const ocean = () => dataSource.loadOcean()
const fishing = () => dataSource.loadFishingEffort()
const ports = () => dataSource.loadPorts()
const activity = () => dataSource.loadActivity()
export const useOcean = () => useResource(ocean)
export const useFishingEffort = () => useResource(fishing)
export const usePorts = () => useResource(ports)
export const useActivity = () => useResource(activity)
