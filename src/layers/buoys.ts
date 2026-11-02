// FAD 浮標（F05）：約 9,000 點，依時間沿漂移軌跡內插，顏色＝估計魚量（0→60 噸：灰→青→白）
// 配色刻意避開暖色：海溫底圖本身是橘黃，暖色浮標會被吃掉
import { ScatterplotLayer } from '@deck.gl/layers'
import type { Buoy, Epoch } from '../data/types'
import { HOUR } from '../sim/geo'
import { TRACK_HOURS } from '../sim/seedBuoys'

export interface BuoyFrame { n: number; pos: Float32Array; tons: Float32Array; t: Epoch }

/** 時間 t 的浮標位置與魚量（扁平陣列，給 deck 用索引存取） */
export function buoyFrame(buoys: Buoy[], trackStart: Epoch, t: Epoch): BuoyFrame {
  const n = buoys.length
  const pos = new Float32Array(n * 2)
  const tons = new Float32Array(n)
  const x = Math.max(0, Math.min(TRACK_HOURS, (t - trackStart) / HOUR))
  const h = Math.min(TRACK_HOURS - 1, Math.floor(x))
  const f = x - h
  for (let i = 0; i < n; i++) {
    const b = buoys[i]
    pos[i * 2] = b.tracks[h * 2] + (b.tracks[h * 2 + 2] - b.tracks[h * 2]) * f
    pos[i * 2 + 1] = b.tracks[h * 2 + 1] + (b.tracks[h * 2 + 3] - b.tracks[h * 2 + 1]) * f
    tons[i] = b.biomass[h] + (b.biomass[h + 1] - b.biomass[h]) * f
  }
  return { n, pos, tons, t }
}

type RGBA = [number, number, number, number]
const STOPS: [number, RGBA][] = [
  [0, [70, 90, 105, 150]],
  [15, [57, 213, 255, 210]],
  [40, [190, 245, 255, 240]],
  [60, [255, 255, 255, 255]],
]
export function biomassColor(tons: number): RGBA {
  if (tons <= STOPS[0][0]) return STOPS[0][1]
  for (let k = 1; k < STOPS.length; k++) {
    const [t1, c1] = STOPS[k]
    if (tons <= t1) {
      const [t0, c0] = STOPS[k - 1]
      const f = (tons - t0) / (t1 - t0)
      return c0.map((v, j) => Math.round(v + (c1[j] - v) * f)) as RGBA
    }
  }
  return STOPS[STOPS.length - 1][1]
}

export function createBuoyLayer(fr: BuoyFrame, zoom: number) {
  const far = zoom < 5
  return new ScatterplotLayer({
    id: 'buoys',
    data: { length: fr.n },
    getPosition: (_: unknown, { index }: { index: number }) => [fr.pos[index * 2], fr.pos[index * 2 + 1]] as [number, number],
    getFillColor: (_: unknown, { index }: { index: number }) => biomassColor(fr.tons[index]),
    getRadius: (_: unknown, { index }: { index: number }) => (far ? 1.4 : 1.4 + fr.tons[index] / 30),
    radiusUnits: 'pixels',
    stroked: false,
    getLineColor: [5, 8, 13, 200],
    lineWidthUnits: 'pixels',
    getLineWidth: 1,
    updateTriggers: { getPosition: fr.t, getFillColor: fr.t, getRadius: [far, fr.t] },
  })
}
