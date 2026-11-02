// 測試用：從 public/data 讀真實網格（只在 vitest 裡用，Node 環境）
import { readFileSync } from 'node:fs'
import { decodeI16 } from '../data/grid'
import type { OceanGrid } from '../data/types'

export function loadGrid(): OceanGrid {
  const dir = new URL('../../public/data/', import.meta.url)
  const meta = JSON.parse(readFileSync(new URL('ocean.json', dir), 'utf8'))
  const f = (k: 'sst' | 'anom' | 'u' | 'v') => {
    const b = readFileSync(new URL(`${k}.i16`, dir))
    return decodeI16(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), meta[k].scale, meta.nodata)
  }
  return { ...meta, sst: f('sst'), anom: f('anom'), u: f('u'), v: f('v'), meta: { sst: meta.sst, anom: meta.anom, u: meta.u, v: meta.v } }
}
