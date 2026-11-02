// 滑鼠所在位置的海況讀值（F02）：直接聽地圖 mousemove，不經過 store，避免全樹重繪
import { useEffect, useState } from 'react'
import type * as maplibregl from 'maplibre-gl'
import { fmtLat, fmtLon, normLon, sample } from '../data/grid'
import type { OceanGrid } from '../data/types'
import { Panel } from './Panel'
import s from './Readout.module.css'

interface Read { lon: number; lat: number; sst: number; anom: number; spd: number; dir: number }

export function Readout({ map, ocean }: { map: maplibregl.Map; ocean: OceanGrid }) {
  const [r, setR] = useState<Read | null>(null)
  useEffect(() => {
    let raf = 0
    const onMove = (e: maplibregl.MapMouseEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const lon = normLon(e.lngLat.lng)
        const lat = e.lngLat.lat
        const u = sample(ocean, ocean.u, lon, lat)
        const v = sample(ocean, ocean.v, lon, lat)
        setR({
          lon, lat,
          sst: sample(ocean, ocean.sst, lon, lat),
          anom: sample(ocean, ocean.anom, lon, lat),
          spd: Math.hypot(u, v),
          dir: ((Math.atan2(u, v) * 180) / Math.PI + 360) % 360, // 流向（往哪流），北=0
        })
      })
    }
    map.on('mousemove', onMove)
    return () => {
      map.off('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [map, ocean])

  const f = (x: number, d: number, unit: string) => (Number.isNaN(x) ? '—' : `${x.toFixed(d)} ${unit}`)
  return (
    <Panel title="游標海況" en="CURSOR" className={s.readout}>
      <div className={s.row}><span>位置</span><span>{r ? `${fmtLat(r.lat)} ${fmtLon(r.lon)}` : '—'}</span></div>
      <div className={s.row}><span>海溫</span><span>{r ? f(r.sst, 1, '°C') : '—'}</span></div>
      <div className={s.row}><span>異常</span><span>{r ? (Number.isNaN(r.anom) ? '—' : `${r.anom >= 0 ? '+' : ''}${r.anom.toFixed(1)} °C`) : '—'}</span></div>
      <div className={s.row}><span>流速／流向</span><span>{r && !Number.isNaN(r.spd) ? `${r.spd.toFixed(2)} m/s ${r.dir.toFixed(0)}°` : '—'}</span></div>
    </Panel>
  )
}
