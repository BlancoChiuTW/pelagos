// 選中船的整趟航次事件點（F07）。v3 減法：不畫事件連線（每日位置來回，連起來像蜘蛛網）；24h 航跡由 fleet-trails 畫
import { ScatterplotLayer } from '@deck.gl/layers'
import type { Position, TripEvent } from '../data/types'
import { EVENT_RGB } from '../sim/labels'

export function createTripTrackLayers(_track: Position[], events: TripEvent[]) {
  return [
    new ScatterplotLayer<TripEvent>({
      id: 'trip-events', data: events.filter((e) => e.type !== 'signal_lost'), getPosition: (e) => [e.lon, e.lat],
      getFillColor: (e) => [...EVENT_RGB[e.type], 170], getRadius: (e) => (e.type === 'set' ? 2.5 : 4), radiusUnits: 'pixels',
    }),
  ]
}
