// 固定種子亂數（mulberry32）。同種子 → 同序列，展示可重現（TECH_SPEC §8.1）
export const SEED = 20261103

export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const range = (rng: Rng, lo: number, hi: number) => lo + (hi - lo) * rng()
export const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]
