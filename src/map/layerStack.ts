// 依狀態組出 deck.gl 圖層（下 → 上，TECH_SPEC §6.2）。只在輸入變動時重組。
import type { Layer } from '@deck.gl/core'
import type { FleetItem } from '../data/useFleet'
import type { OthersFrame } from '../sim/useOthers'
import type { AppState } from '../store'
import { createFleetLayer } from '../layers/fleet'
import { createOthersLayer } from '../layers/others'
import { createBuoyLayer, type BuoyFrame } from '../layers/buoys'
import { createTripTrackLayers } from '../layers/tripTrack'
import type { TripEvent } from '../data/types'

export interface StackInput {
  layers: AppState['layers']
  zoom: number
  fleet: FleetItem[]
  others: OthersFrame | null
  buoys: BuoyFrame | null
  selectedId: string | null
  /** 選中船的航次事件 */
  selectedEvents: TripEvent[]
  onSelect: (id: string) => void
}

export function buildLayers(i: StackInput): Layer[] {
  const out: Layer[] = []
  if (i.layers.others && i.others) out.push(createOthersLayer(i.others, i.zoom))
  if (i.layers.buoys && i.buoys) out.push(createBuoyLayer(i.buoys, i.zoom))
  const sel = i.fleet.find((f) => f.vessel.id === i.selectedId)
  if (i.layers.track && sel) out.push(...createTripTrackLayers(sel.track, i.selectedEvents))
  if (i.layers.fleet && i.fleet.length) out.push(createFleetLayer(i.fleet, i.selectedId, i.onSelect))
  return out
}
