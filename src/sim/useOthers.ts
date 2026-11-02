// 周邊船 worker 的 React 介面：數量或網格變了就重建 worker；每次 t 變動送 tick
import { useEffect, useRef, useState } from 'react'
import type { OceanGrid } from '../data/types'
import type { FromWorker, ToWorker } from './others.worker'
import OthersWorker from './others.worker?worker'
import { SEED } from './rng'

export interface OthersFrame { count: number; positions: Float32Array; t: number }

export function useOthers(grid: OceanGrid | null, count: number, t: number, enabled: boolean): OthersFrame | null {
  const [frame, setFrame] = useState<OthersFrame | null>(null)
  const ref = useRef<Worker | null>(null)

  useEffect(() => {
    if (!grid || !enabled) return
    const w = new OthersWorker()
    ref.current = w
    w.onmessage = (e: MessageEvent<FromWorker>) => setFrame({ count: e.data.count, positions: e.data.positions, t: e.data.t })
    const landmask = new Uint8Array(grid.sst.length)
    for (let i = 0; i < landmask.length; i++) landmask[i] = Number.isNaN(grid.sst[i]) ? 1 : 0
    const { width, height, lon0, lat0, dlon, dlat, bounds, wrap } = grid
    const msg: ToWorker = { kind: 'init', count, seed: SEED + 7, landmask, grid: { width, height, lon0, lat0, dlon, dlat, bounds, wrap }, t: Date.now() }
    w.postMessage(msg, [landmask.buffer])
    return () => {
      w.terminate()
      ref.current = null
    }
  }, [grid, count, enabled])

  useEffect(() => {
    ref.current?.postMessage({ kind: 'tick', t } satisfies ToWorker)
  }, [t])

  return enabled ? frame : null
}
