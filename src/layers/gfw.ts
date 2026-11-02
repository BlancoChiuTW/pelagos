// 周邊漁船活動（GFW 4Wings）：捕魚時數熱度圖。用紫粉色系，和海溫（藍綠／金）、自家船（白／青）區分
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import type { FishingEffort } from '../data/types'

type Cell = FishingEffort['cells'][number]
export const GEAR_LABEL: Record<string, string> = {
  tuna_purse_seines: '鮪圍網', drifting_longlines: '流刺延繩釣', squid_jigger: '魷釣', pole_and_line: '竿釣',
  trawlers: '拖網', other_purse_seines: '其他圍網', fishing: '其他',
}

export function createGfwLayer(e: FishingEffort, gear: string) {
  const gi = e.gears.indexOf(gear)
  const data = gear === 'all' ? e.cells : e.cells.filter((c) => c[3] === gi)
  return new HeatmapLayer<Cell>({
    id: 'gfw-effort',
    data,
    getPosition: (c) => [c[0], c[1]],
    getWeight: (c) => c[2],
    radiusPixels: 26,
    intensity: 1.1,
    threshold: 0.04,
    opacity: 0.55,
    colorRange: [
      [60, 30, 110, 0],
      [96, 52, 160, 90],
      [140, 70, 190, 140],
      [190, 90, 200, 180],
      [235, 120, 200, 210],
      [255, 190, 230, 235],
    ],
    updateTriggers: { getWeight: gear },
  })
}
