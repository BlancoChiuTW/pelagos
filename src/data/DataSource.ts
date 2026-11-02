// 資料介面（TECH_SPEC §5）。畫面與圖層只透過這裡拿資料；之後換 API 只改這個檔。
import { decodeI16 } from './grid'
import { seed } from '../sim/seed'
import type { Epoch, FieldMeta, FleetSnapshot, GridMeta, OceanGrid } from './types'

export interface DataSource {
  loadOcean(): Promise<OceanGrid>
  loadFleet(ocean: OceanGrid, now: Epoch): Promise<FleetSnapshot>
}

type FieldKey = 'sst' | 'anom' | 'u' | 'v'
interface OceanJson extends GridMeta {
  nodata: number
  sst: FieldMeta & { scale: number }
  anom: FieldMeta & { scale: number }
  u: FieldMeta & { scale: number }
  v: FieldMeta & { scale: number }
}

export const dataUrl = (name: string) => `${import.meta.env.BASE_URL}data/${name}`

async function fetchOk(url: string): Promise<Response> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`)
  return r
}

export class StaticSource implements DataSource {
  async loadOcean(): Promise<OceanGrid> {
    const meta = (await (await fetchOk(dataUrl('ocean.json'))).json()) as OceanJson
    const keys: FieldKey[] = ['sst', 'anom', 'u', 'v']
    const bufs = await Promise.all(keys.map(async (k) => (await fetchOk(dataUrl(`${k}.i16`))).arrayBuffer()))
    const [sst, anom, u, v] = keys.map((k, i) => decodeI16(bufs[i], meta[k].scale, meta.nodata))
    const { width, height, lon0, lat0, dlon, dlat, bounds } = meta
    const pick = (k: FieldKey): FieldMeta => ({ time: meta[k].time, source: meta[k].source, unit: meta[k].unit })
    return {
      width, height, lon0, lat0, dlon, dlat, bounds, sst, anom, u, v,
      meta: { sst: pick('sst'), anom: pick('anom'), u: pick('u'), v: pick('v') },
    }
  }

  async loadFleet(ocean: OceanGrid, now: Epoch): Promise<FleetSnapshot> {
    // 模擬資料（S01）；正式版改成 API：GET /vessels、/trips、/events、/positions、/buoys
    return seed(ocean, now)
  }
}

export const dataSource: DataSource = new StaticSource()
