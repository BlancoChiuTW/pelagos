// 選中船的航次軌跡（F07）：整趟事件連線（淡）＋過去 24h 船位（亮）＋事件點
import { PathLayer, ScatterplotLayer } from '@deck.gl/layers'
import type { Position, TripEvent } from '../data/types'
import { EVENT_RGB } from '../sim/labels'

export function createTripTrackLayers(track: Position[], events: TripEvent[]) {
  const tripPath = events.filter((e) => e.type !== 'signal_lost').map((e) => [e.lon, e.lat] as [number, number])
  const recent = track.map((p) => [p.lon, p.lat] as [number, number])
  return [
    new PathLayer({
      id: 'trip-path', data: [{ path: tripPath }], getPath: (d: { path: [number, number][] }) => d.path,
      getColor: [57, 213, 255, 90], getWidth: 1.5, widthUnits: 'pixels',
    }),
    new PathLayer({
      id: 'trip-recent', data: [{ path: recent }], getPath: (d: { path: [number, number][] }) => d.path,
      getColor: [200, 245, 255, 230], getWidth: 2.5, widthUnits: 'pixels', jointRounded: true, capRounded: true,
    }),
    new ScatterplotLayer<TripEvent>({
      id: 'trip-events', data: events, getPosition: (e) => [e.lon, e.lat],
      getFillColor: (e) => [...EVENT_RGB[e.type], 230], getRadius: (e) => (e.type === 'set' ? 3 : 4.5), radiusUnits: 'pixels',
      stroked: true, getLineColor: [5, 8, 13, 220], getLineWidth: 1, lineWidthUnits: 'pixels',
    }),
  ]
}
