// 警示規則（TECH_SPEC §8.5，純函式）。id 固定，才能記住「已處理」
import type { Alert, Epoch, FleetSnapshot } from '../data/types'
import type { FleetItem } from '../data/useFleet'
import { DAY, HOUR } from './geo'
import { mulberry32 } from './rng'

/** 每艘圍網船的 PNA 入漁天數剩餘（模擬，固定值） */
export function vdsRemaining(vesselId: string): number {
  let h = 7
  for (const c of vesselId) h = (h * 33 + c.charCodeAt(0)) >>> 0
  return 3 + Math.floor(mulberry32(h)() * 58)
}

/** 距下一個 WCPFC FAD 禁用期（7/1）的天數 */
export function daysToFadClosure(now: Epoch): number {
  const d = new Date(now)
  let y = d.getUTCFullYear()
  if (Date.UTC(y, 6, 1) <= now) y++
  return Math.ceil((Date.UTC(y, 6, 1) - now) / DAY)
}

export function buildAlerts(fleet: FleetItem[], snap: FleetSnapshot, now: Epoch): Alert[] {
  const out: Alert[] = []
  for (const f of fleet) {
    const { vessel: v, pose, trip } = f
    const last = f.track.at(-1)
    if (f.status === 'signal_lost' && last)
      out.push({ id: `lost:${v.id}`, level: 'alert', at: last.at + 2 * HOUR, vesselId: v.id, lon: pose.lon, lat: pose.lat, title: `${v.name} 訊號中斷`, body: `已 ${Math.round((now - last.at) / HOUR)} 小時未收到船位回報，最後位置如地圖` })
    if (trip.summary.fuelPct < 20)
      out.push({ id: `fuel:${v.id}`, level: 'warn', at: now - HOUR, vesselId: v.id, lon: pose.lon, lat: pose.lat, title: `${v.name} 油料偏低`, body: `剩 ${trip.summary.fuelPct}%，建議安排補給或返港` })
    if (v.type === 'purse_seiner') {
      const n = vdsRemaining(v.id)
      if (n < 15) out.push({ id: `vds:${v.id}`, level: 'warn', at: now - 6 * HOUR, vesselId: v.id, lon: pose.lon, lat: pose.lat, title: `${v.name} 入漁天數剩 ${n} 天`, body: 'PNA 入漁天數（VDS）即將用完，需申購或移出 EEZ' })
    }
  }
  for (const e of snap.events)
    if (e.type === 'transship' && e.at > now - DAY && e.at <= now)
      out.push({ id: `ts:${e.id}`, level: 'info', at: e.at, vesselId: e.vesselId, lon: e.lon, lat: e.lat, title: `轉載完成 · ${e.detail.port ?? ''}`, body: `${fleet.find((f) => f.vessel.id === e.vesselId)?.vessel.name ?? ''} ↔ ${e.detail.counterpart ?? ''}` })
  const d = daysToFadClosure(now)
  out.push({ id: `fad:${new Date(now).getUTCFullYear()}`, level: d <= 30 ? 'warn' : 'info', at: now - 12 * HOUR, title: `FAD 禁用期倒數 ${d} 天`, body: 'WCPFC：每年 7/1–8/15 禁止在集魚器上下網，請提前規劃作業' })
  const rank = { alert: 0, warn: 1, info: 2 }
  return out.sort((a, b) => rank[a.level] - rank[b.level] || b.at - a.at)
}
