// 依狀態組出 deck.gl 圖層（下 → 上，TECH_SPEC §6.2）。只在輸入變動時重組。
import type { Layer } from '@deck.gl/core'
import type { FleetItem } from '../data/useFleet'
import type { OthersFrame } from '../sim/useOthers'
import type { AppState } from '../store'
import { createFleetLayers } from '../layers/fleet'
import { createOthersLayer } from '../layers/others'
import { createBuoyLayer, type BuoyFrame } from '../layers/buoys'
import { createTripTrackLayers } from '../layers/tripTrack'
import { createImportLayers } from '../layers/imports'
import { createPortLayers } from '../layers/ports'
import { createActivityLayer } from '../layers/activity'
import type { ActivityEvent, Port } from '../data/types'
import type { ImportLayer } from '../data/overrides'
import type { Epoch, TripEvent } from '../data/types'

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
  trackStart: Epoch
  t: Epoch
  imports: ImportLayer[]
  ports: Port[]
  activity: ActivityEvent[]
}

export function buildLayers(i: StackInput): Layer[] {
  const out: Layer[] = []
  if (i.layers.others && i.others) out.push(createOthersLayer(i.others, i.zoom))
  if (i.layers.buoys && i.buoys) out.push(createBuoyLayer(i.buoys, i.zoom))
  if (i.layers.ports && i.ports.length) out.push(...createPortLayers(i.ports, i.zoom))
  if (i.layers.activity && i.activity.length) out.push(...createActivityLayer(i.activity, i.layers.aisgap, i.zoom))
  if (i.imports.length) out.push(...createImportLayers(i.imports, i.zoom))
  const sel = i.fleet.find((f) => f.vessel.id === i.selectedId)
  if (sel) out.push(...createTripTrackLayers(sel.track, i.selectedEvents))
  if (i.layers.fleet && i.fleet.length)
    out.push(...createFleetLayers({ items: i.fleet, selectedId: i.selectedId, zoom: i.zoom, showTrails: i.layers.track, trackStart: i.trackStart, t: i.t, onSelect: i.onSelect }))
  return out
}
