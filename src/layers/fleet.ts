// 自家船隊（F04）：IconLayer，箭頭依航向旋轉、依狀態上色，可點選
import { IconLayer } from '@deck.gl/layers'
import type { FleetItem } from '../data/useFleet'
import type { VesselStatus } from '../data/types'

type RGBA = [number, number, number, number]
export const STATUS_RGB: Record<VesselStatus, RGBA> = {
  fishing: [62, 224, 143, 255],
  transit: [57, 213, 255, 255],
  drifting: [150, 168, 182, 255],
  in_port: [235, 242, 247, 255],
  signal_lost: [255, 77, 94, 255],
}

const svg = (body: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${body}</svg>`)}`
const ICONS = {
  purse_seiner: { url: svg('<polygon points="32,4 54,58 32,46 10,58" fill="#fff"/>'), width: 64, height: 64, mask: true },
  reefer: { url: svg('<polygon points="32,2 47,18 47,60 17,60 17,18" fill="#fff"/><rect x="23" y="24" width="18" height="28" fill="#000" opacity="0"/>'), width: 64, height: 64, mask: true },
}

export function createFleetLayer(items: FleetItem[], selectedId: string | null, onSelect: (id: string) => void) {
  return new IconLayer<FleetItem>({
    id: 'fleet',
    data: items,
    getPosition: (d) => [d.pose.lon, d.pose.lat],
    getIcon: (d) => ICONS[d.vessel.type],
    getSize: (d) => (d.vessel.id === selectedId ? 34 : d.vessel.type === 'reefer' ? 28 : 24),
    sizeUnits: 'pixels',
    getAngle: (d) => -d.pose.cog, // deck 逆時針為正，航向順時針
    getColor: (d) => STATUS_RGB[d.status],
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 80],
    onClick: (info) => {
      if (info.object) onSelect(info.object.vessel.id)
    },
    updateTriggers: { getSize: selectedId },
  })
}
