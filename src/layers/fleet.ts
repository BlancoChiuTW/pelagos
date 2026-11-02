// 自家船隊（V02 戰略地圖表現）：航跡拖尾 → 狀態環 → 俯視剪影 → 名牌
import { IconLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { TripsLayer } from '@deck.gl/geo-layers'
import type { Layer } from '@deck.gl/core'
import type { Epoch, VesselStatus } from '../data/types'
import type { FleetItem } from '../data/useFleet'
import { HOUR } from '../sim/geo'

type RGBA = [number, number, number, number]
// Apple 深色系統色
export const STATUS_RGB: Record<VesselStatus, RGBA> = {
  fishing: [48, 209, 88, 255],
  transit: [100, 210, 255, 255],
  drifting: [142, 142, 147, 255],
  in_port: [235, 235, 245, 255],
  signal_lost: [255, 69, 58, 255],
}
const TINT: RGBA = [100, 210, 255, 255]

// 俯視剪影（北朝上，mask 用；鏤空處透出地圖＝細節）
const svg = (body: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${body}</svg>`)}`
const ICONS = {
  // 圍網船：尖船首、前段駕駛艙（鏤空）、船尾工作甲板＋小艇
  purse_seiner: {
    url: svg(`<path fill="#fff" fill-rule="evenodd" d="M32 3C37 9 40 17 40 26V53C40 57 37 59 32 59S24 57 24 53V26C24 17 27 9 32 3ZM28 20H36V29H28Z"/><ellipse cx="32" cy="58" rx="5" ry="3.2" fill="#fff"/>`),
    width: 64, height: 64, mask: true,
  },
  // 運搬船：長船身、三個貨艙蓋（鏤空）、船尾駕駛樓
  reefer: {
    url: svg(`<path fill="#fff" fill-rule="evenodd" d="M32 1C36 6 38 12 38 18V58C38 61 36 63 32 63S26 61 26 58V18C26 12 28 6 32 1ZM29 16H35V24H29ZM29 27H35V35H29ZM29 38H35V46H29Z"/>`),
    width: 64, height: 64, mask: true,
  },
}

interface Opts {
  items: FleetItem[]
  selectedId: string | null
  zoom: number
  showTrails: boolean
  trackStart: Epoch
  t: Epoch
  onSelect: (id: string) => void
}

export function createFleetLayers({ items, selectedId, zoom, showTrails, trackStart, t, onSelect }: Opts): Layer[] {
  const out: Layer[] = []
  const now = (t - trackStart) / HOUR // TripsLayer 時間用「小時」，避開 Float32 精度
  const far = zoom < 4
  const pick = (id: string) => onSelect(id)

  if (showTrails) {
    out.push(
      new TripsLayer<FleetItem>({
        id: 'fleet-trails',
        data: items,
        getPath: (d) => d.track.map((p) => [p.lon, p.lat] as [number, number]),
        getTimestamps: (d) => d.track.map((p) => (p.at - trackStart) / HOUR),
        getColor: (d) => (d.vessel.id === selectedId ? TINT : [190, 232, 255, 215]),
        getWidth: (d) => (d.vessel.id === selectedId ? 3.5 : 2.4),
        widthUnits: 'pixels',
        currentTime: now,
        trailLength: 24,
        fadeTrail: true,
        capRounded: true,
        jointRounded: true,
        updateTriggers: { getColor: selectedId, getWidth: selectedId },
      }),
    )
  }
  // 狀態環（只描邊，深色底襯出剪影）
  out.push(
    new ScatterplotLayer<FleetItem>({
      id: 'fleet-rings',
      data: items,
      getPosition: (d) => [d.pose.lon, d.pose.lat],
      getRadius: (d) => (d.vessel.id === selectedId ? 20 : far ? 10 : 14),
      radiusUnits: 'pixels',
      filled: true,
      getFillColor: [0, 0, 0, 110],
      stroked: true,
      getLineColor: (d) => (d.vessel.id === selectedId ? TINT : STATUS_RGB[d.status]),
      getLineWidth: (d) => (d.vessel.id === selectedId ? 2.5 : 1.8),
      lineWidthUnits: 'pixels',
      pickable: true,
      onClick: (info) => info.object && pick(info.object.vessel.id),
      updateTriggers: { getRadius: [selectedId, far], getLineColor: selectedId, getLineWidth: selectedId },
    }),
  )
  out.push(
    new IconLayer<FleetItem>({
      id: 'fleet-ships',
      data: items,
      getPosition: (d) => [d.pose.lon, d.pose.lat],
      getIcon: (d) => ICONS[d.vessel.type],
      getSize: (d) => (far ? 16 : d.vessel.type === 'reefer' ? 26 : 22) + (d.vessel.id === selectedId ? 6 : 0),
      sizeUnits: 'pixels',
      getAngle: (d) => -d.pose.cog,
      getColor: (d) => (d.status === 'signal_lost' ? [255, 160, 150, 255] : [236, 240, 244, 255]),
      pickable: true,
      onClick: (info) => info.object && pick(info.object.vessel.id),
      updateTriggers: { getSize: [selectedId, far] },
    }),
  )
  const labeled = zoom >= 4.5 ? items : items.filter((d) => d.vessel.id === selectedId)
  out.push(
    new TextLayer<FleetItem>({
      id: 'fleet-labels',
      data: labeled,
      getPosition: (d) => [d.pose.lon, d.pose.lat],
      getText: (d) => d.vessel.name,
      getPixelOffset: [0, 26],
      getSize: 12,
      getColor: [255, 255, 255, 235],
      fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", sans-serif',
      fontWeight: 600,
      characterSet: 'auto',
      background: true,
      getBackgroundColor: [20, 20, 22, 190],
      backgroundPadding: [6, 3],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'top',
    }),
  )
  return out
}
