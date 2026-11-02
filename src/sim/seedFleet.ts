// 自家船隊、航次、事件、過去 24h 船位（TECH_SPEC §8.2）。全部虛構：藍潮漁業。
import { isLand, sample } from '../data/grid'
import type { Epoch, Lat, Lon, OceanGrid, Position, Trip, TripEvent, Vessel } from '../data/types'
import { bearing, DAY, distNm, HOME_PORT, HOUR, localHour, move, TRANSSHIP_PORTS, type Port } from './geo'
import { pick, range, type Rng } from './rng'

export const FLEET_NAME = '藍潮漁業'
export const SEINERS = 30
export const REEFERS = 6
/** 刻意安排的展示狀況（TECH_SPEC §8.2） */
export const SHOWCASE = { signalLost: [3, 17], lowFuel: 8, inPort: 5 } as const

export interface FleetSeed {
  vessels: Vessel[]
  trips: Trip[]
  events: TripEvent[]
  positions: Position[]
  /** 每艘圍網船的作業中心，給浮標用 */
  bases: { vesselId: string; lon: Lon; lat: Lat }[]
}

const sea = (g: OceanGrid, lon: Lon, lat: Lat) => !isLand(g, g.sst, lon, lat)

/** 作業區 5°S–10°N、140°E–185°E，偏好 SST 28–30°C */
function pickBase(g: OceanGrid, rng: Rng): [Lon, Lat] {
  for (let t = 0; t < 200; t++) {
    const lon = range(rng, 140, 185)
    const lat = range(rng, -5, 10)
    const sst = sample(g, g.sst, lon, lat)
    if (Number.isNaN(sst)) continue
    if (sst >= 28 && sst <= 30.5 && rng() < 0.9) return [lon, lat]
    if (rng() < 0.15) return [lon, lat]
  }
  return [165, 5]
}

/** 往 heading 走 nm；撞陸地就不動並回頭 */
function step(g: OceanGrid, lon: Lon, lat: Lat, heading: number, nm: number): [Lon, Lat, number] {
  const [nl, nt] = move(lon, lat, heading, nm)
  return sea(g, nl, nt) ? [nl, nt, heading] : [lon, lat, (heading + 180) % 360]
}

/** 當地時間 hh 點在「t 所在那一天」的 UTC 時刻 */
const atLocal = (dayStart: Epoch, lon: Lon, hh: number) => dayStart + (((hh - lon / 15) % 24) + 24) % 24 * HOUR

export function seedFleet(g: OceanGrid, rng: Rng, now: Epoch): FleetSeed {
  const vessels: Vessel[] = []
  const trips: Trip[] = []
  const events: TripEvent[] = []
  const positions: Position[] = []
  const bases: FleetSeed['bases'] = []
  let eid = 0
  const ev = (trip: Trip, at: Epoch, type: TripEvent['type'], lon: Lon, lat: Lat, detail: TripEvent['detail'] = {}) =>
    events.push({ id: `E${++eid}`, tripId: trip.id, vesselId: trip.vesselId, at, type, lon, lat, detail })
  const start24 = now - 24 * HOUR
  const pohnpei = TRANSSHIP_PORTS[0]

  // ── 圍網船 ──
  for (let i = 0; i < SEINERS; i++) {
    const id = `PS${101 + i}`
    vessels.push({ id, name: `藍潮 ${101 + i}`, type: 'purse_seiner', flag: 'TW', fleet: FLEET_NAME })
    const inPort = i === SHOWCASE.inPort
    let [bLon, bLat] = inPort ? move(pohnpei.lon, pohnpei.lat, 90, 120) : pickBase(g, rng)
    bases.push({ vesselId: id, lon: bLon, lat: bLat })
    const days = Math.floor(range(rng, 20, 90))
    const departedAt = now - days * DAY
    const port: Port = rng() < 0.3 ? HOME_PORT : pick(rng, TRANSSHIP_PORTS)
    const trip: Trip = { id: `T-${id}`, vesselId: id, departedAt, departPort: port.name, status: 'active', summary: { days, sets: 0, catchTons: 0, fuelPct: 95, activeBuoys: 0 } }
    trips.push(trip)
    ev(trip, departedAt, 'depart', port.lon, port.lat, { port: port.name })

    // 歷史：每天一網（80%），每 ~6 天放浮標，每 25–35 天進港轉載
    let [lon, lat] = [bLon, bLat]
    let fuel = 95
    let nextPort = Math.floor(range(rng, 25, 35))
    for (let d = 1; d < days; d++) {
      const dayStart = departedAt + d * DAY
      if (dayStart >= start24) break
      fuel -= 1.1
      if (d === nextPort) {
        const tp = TRANSSHIP_PORTS.reduce((a, b) => (distNm(lon, lat, a.lon, a.lat) < distNm(lon, lat, b.lon, b.lat) ? a : b))
        ev(trip, atLocal(dayStart, tp.lon, 8), 'port_call', tp.lon, tp.lat, { port: tp.name })
        ev(trip, atLocal(dayStart, tp.lon, 13), 'transship', tp.lon, tp.lat, { port: tp.name, counterpart: `藍潮運 ${1 + Math.floor(rng() * REEFERS)}`, catchTons: Math.round(trip.summary.catchTons) })
        if (rng() < 0.6) {
          ev(trip, atLocal(dayStart, tp.lon, 17), 'bunker', tp.lon, tp.lat, { port: tp.name })
          fuel = 95
        }
        trip.summary.catchTons = 0 // 轉載後艙內歸零（summary.catchTons = 本次轉載後累計）
        nextPort += Math.floor(range(rng, 25, 35))
        continue
      }
      const hd = distNm(lon, lat, bLon, bLat) > 150 ? bearing(lon, lat, bLon, bLat) : rng() * 360
      ;[lon, lat] = step(g, lon, lat, hd, range(rng, 20, 80))
      if (rng() < 0.8) {
        const tons = rng() < 0.15 ? range(rng, 0, 2) : range(rng, 5, 60)
        trip.summary.sets++
        trip.summary.catchTons += tons
        ev(trip, atLocal(dayStart, lon, 7), 'set', lon, lat, { catchTons: Math.round(tons * 10) / 10 })
      }
      if (d % 6 === 3) ev(trip, atLocal(dayStart, lon, 15), 'deploy_buoy', lon, lat, { note: `放置 ${Math.floor(range(rng, 15, 40))} 個浮標` })
    }

    // 過去 24h：每小時一筆船位，作息依當地時間（白天搜魚、清晨下網、夜間漂流）
    let heading = rng() * 360
    let setToday = false
    if (inPort) [lon, lat] = [pohnpei.lon, pohnpei.lat]
    const lostAt = i === SHOWCASE.signalLost[0] ? now - 3 * HOUR : i === SHOWCASE.signalLost[1] ? now - 5 * HOUR : Infinity
    for (let h = 0; h <= 24; h++) {
      const t = start24 + h * HOUR
      if (t > lostAt) break
      const lh = localHour(t, lon)
      let sog: number
      if (inPort) sog = 0
      else if (lh >= 6 && lh < 9) {
        sog = 0.4
        if (!setToday) {
          setToday = true
          const tons = range(rng, 5, 60)
          trip.summary.sets++
          trip.summary.catchTons += tons
          ev(trip, t, 'set', lon, lat, { catchTons: Math.round(tons * 10) / 10 })
        }
      } else if (lh >= 9 && lh < 17) {
        sog = range(rng, 9, 12)
        heading = distNm(lon, lat, bLon, bLat) > 120 ? bearing(lon, lat, bLon, bLat) : (heading + range(rng, -25, 25) + 360) % 360
      } else {
        sog = 0.5
        const u = sample(g, g.u, lon, lat)
        const v = sample(g, g.v, lon, lat)
        if (!Number.isNaN(u)) heading = ((Math.atan2(u, v) * 180) / Math.PI + 360) % 360
      }
      positions.push({ vesselId: id, at: t, lon, lat, sog: Math.round(sog * 10) / 10, cog: Math.round(heading) })
      if (sog > 0) [lon, lat, heading] = step(g, lon, lat, heading, sog)
    }
    if (inPort) {
      ev(trip, now - 20 * HOUR, 'port_call', pohnpei.lon, pohnpei.lat, { port: pohnpei.name })
      ev(trip, now - 5 * HOUR, 'transship', pohnpei.lon, pohnpei.lat, { port: pohnpei.name, counterpart: '藍潮運 1', catchTons: Math.round(trip.summary.catchTons) })
      ev(trip, now - 3 * HOUR, 'bunker', pohnpei.lon, pohnpei.lat, { port: pohnpei.name })
      trip.summary.catchTons = 0
      fuel = 95
    }
    if (lostAt !== Infinity) ev(trip, lostAt + HOUR, 'signal_lost', lon, lat, { note: '超過 2 小時未收到船位回報' })
    trip.summary.catchTons = Math.round(trip.summary.catchTons)
    trip.summary.fuelPct = i === SHOWCASE.lowFuel ? 15 : Math.max(22, Math.round(fuel))
  }

  // ── 運搬船：在轉載港與作業區之間直航；藍潮運 1 停在 Pohnpei 港 ──
  for (let j = 0; j < REEFERS; j++) {
    const id = `RF${j + 1}`
    vessels.push({ id, name: `藍潮運 ${j + 1}`, type: 'reefer', flag: 'TW', fleet: FLEET_NAME })
    const port = j === 0 ? pohnpei : TRANSSHIP_PORTS[j % TRANSSHIP_PORTS.length]
    const days = Math.floor(range(rng, 30, 50))
    const trip: Trip = { id: `T-${id}`, vesselId: id, departedAt: now - days * DAY, departPort: HOME_PORT.name, status: 'active', summary: { days, sets: 0, catchTons: Math.round(range(rng, 300, 1200)), fuelPct: Math.round(range(rng, 40, 85)), activeBuoys: 0 } }
    trips.push(trip)
    ev(trip, trip.departedAt, 'depart', HOME_PORT.lon, HOME_PORT.lat, { port: HOME_PORT.name })
    for (let k = 0; k < 2; k++) {
      const at = now - range(rng, 3, days - 2) * DAY
      ev(trip, at, 'transship', port.lon, port.lat, { port: port.name, counterpart: `藍潮 ${101 + Math.floor(rng() * SEINERS)}` })
    }
    const target = bases[(j * 5 + 2) % bases.length]
    const outbound = j % 2 === 0
    const [fromLon, fromLat, toLon, toLat] = outbound ? [port.lon, port.lat, target.lon, target.lat] : [target.lon, target.lat, port.lon, port.lat]
    const sogKn = range(rng, 12, 14)
    if (j !== 0) trip.plan = { name: outbound ? `${target.vesselId.replace('PS', '藍潮 ')} 會合點` : port.name, lon: toLon, lat: toLat }
    let [lon, lat] = j === 0 ? [port.lon, port.lat] : [fromLon, fromLat]
    if (j !== 0) [lon, lat] = move(lon, lat, bearing(fromLon, fromLat, toLon, toLat), range(rng, 0, Math.max(0, distNm(fromLon, fromLat, toLon, toLat) - 24 * sogKn)))
    for (let h = 0; h <= 24; h++) {
      const t = start24 + h * HOUR
      const arrived = j === 0 || distNm(lon, lat, toLon, toLat) < sogKn
      const cog = Math.round(bearing(lon, lat, toLon, toLat))
      positions.push({ vesselId: id, at: t, lon, lat, sog: arrived ? 0 : Math.round(sogKn * 10) / 10, cog })
      if (!arrived) [lon, lat] = step(g, lon, lat, cog, sogKn)
    }
    if (j === 0) ev(trip, now - 5 * HOUR, 'transship', port.lon, port.lat, { port: port.name, counterpart: `藍潮 ${101 + SHOWCASE.inPort}` })
  }

  events.sort((a, b) => a.at - b.at)
  return { vessels, trips, events, positions, bases }
}
