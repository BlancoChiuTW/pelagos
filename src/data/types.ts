// 領域型別（TECH_SPEC §4）。經度一律 0–360，時間一律 UTC 毫秒。

export type Lon = number
export type Lat = number
export type Epoch = number

export type VesselType = 'purse_seiner' | 'reefer'
export type VesselStatus = 'fishing' | 'transit' | 'drifting' | 'in_port' | 'signal_lost'

export interface Vessel {
  id: string
  name: string
  type: VesselType
  flag: string
  fleet: string
}

export interface TripSummary {
  days: number
  sets: number
  catchTons: number
  fuelPct: number
  activeBuoys: number
}

export interface Trip {
  id: string
  vesselId: string
  departedAt: Epoch
  departPort: string
  status: 'active' | 'returned'
  summary: TripSummary
  /** 預定航線目的地（運搬船），戰略地圖畫虛線＋ETA */
  plan?: { name: string; lon: Lon; lat: Lat }
}

export type EventType = 'depart' | 'set' | 'deploy_buoy' | 'transship' | 'port_call' | 'bunker' | 'signal_lost'

export interface TripEvent {
  id: string
  tripId: string
  vesselId: string
  at: Epoch
  type: EventType
  lon: Lon
  lat: Lat
  detail: { catchTons?: number; port?: string; counterpart?: string; note?: string }
}

export interface Position {
  vesselId: string
  at: Epoch
  lon: Lon
  lat: Lat
  sog: number
  cog: number
}

export interface Buoy {
  id: string
  vesselId: string
  /** 每小時一筆 [lon,lat]，共 TRACK_HOURS+1 筆（過去 24h＋現在） */
  tracks: Float32Array
  /** 與 tracks 同步的估計魚量（噸） */
  biomass: Float32Array
}

export interface GridMeta {
  width: number
  height: number
  lon0: Lon
  lat0: Lat
  dlon: number
  dlat: number
  bounds: [number, number, number, number]
  /** 經度涵蓋 360°（全球），取樣時左右相接 */
  wrap?: boolean
}

export interface FieldMeta {
  time: string
  source: string
  unit: string
}

export interface OceanGrid extends GridMeta {
  /** 陸地 = NaN */
  sst: Float32Array
  anom: Float32Array
  u: Float32Array
  v: Float32Array
  meta: Record<'sst' | 'anom' | 'u' | 'v', FieldMeta>
}

export type AlertLevel = 'info' | 'warn' | 'alert'

export interface Alert {
  id: string
  level: AlertLevel
  at: Epoch
  vesselId?: string
  lon?: Lon
  lat?: Lat
  title: string
  body: string
}

export interface FleetSnapshot {
  vessels: Vessel[]
  trips: Trip[]
  events: TripEvent[]
  positions: Position[]
  buoys: Buoy[]
}

/** 周邊漁船活動（GFW 4Wings 表觀捕魚努力量，etl/fetch_gfw.py 正規化後） */
export interface FishingEffort {
  mode: 'live' | 'mock'
  dataset: string
  dateRange: [string, string]
  resolution: string
  source: string
  gears: string[]
  /** [lon(0–360), lat, hours, gearIndex, vessels] */
  cells: [number, number, number, number, number][]
}

/** 港口與停靠站（GFW 進港事件，依錨地彙整；etl/fetch_ports.py） */
export interface Port {
  name: string
  country: string
  lat: Lat
  lon: Lon
  visits: number
  fishing: number
  carrier: number
  vessels: number
  topFlags: [string, number][]
  medianHrs: number | null
}
export interface PortStats { mode: 'live' | 'mock'; dataset: string; dateRange: [string, string]; source: string; ports: Port[] }
