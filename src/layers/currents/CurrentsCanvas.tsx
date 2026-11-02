// 洋流粒子繪製（F03）：畫在夾層 canvas 上（MapLibre 之上、deck 之下）
import { useEffect } from 'react'
import type * as maplibregl from 'maplibre-gl'
import type { OceanGrid } from '../../data/types'
import { mulberry32, SEED } from '../../sim/rng'
import { ParticleField, particleCount, type Bounds } from './ParticleField'

const FADE = 0.92
/** 移動中粒子短線拉長倍數（沒有拖尾時仍看得出流向） */
const MOVE_STREAK = 7
const PX_PER_FRAME_AT_1MS = 0.6 // 1 m/s 的粒子每幀走幾個像素
// 依流速分 4 段上色（批次畫，一段一次 stroke）
const BUCKETS = [0.15, 0.4, 0.8, Infinity]
const COLORS = ['rgba(255,255,255,0.32)', 'rgba(230,248,255,0.55)', 'rgba(210,245,255,0.8)', 'rgba(255,255,255,1)']

interface Props {
  map: maplibregl.Map
  canvas: HTMLCanvasElement
  grid: OceanGrid
  enabled: boolean
  maxParticles: number
}

function viewBounds(map: maplibregl.Map): Bounds {
  const b = map.getBounds()
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
}

export function CurrentsCanvas({ map, canvas, grid, enabled, maxParticles }: Props) {
  useEffect(() => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const clear = () => ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!enabled) {
      clear()
      return
    }
    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
    }
    resize()
    const field = new ParticleField(grid, particleCount(canvas.clientWidth, canvas.clientHeight, maxParticles), mulberry32(SEED), viewBounds(map))
    let raf = 0
    let moving = false

    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      // 地圖移動中：拖尾殘影會留在舊螢幕位置，所以每幀清空、粒子改畫成沿流向拉長的短線；停下後回到長拖尾
      if (moving) field.setBounds(viewBounds(map))
      // 1 度經度在赤道上的像素數 = 512·2^z / 360
      const pxPerDeg = (512 * 2 ** map.getZoom()) / 360
      field.step(PX_PER_FRAME_AT_1MS / pxPerDeg)
      if (moving) clear()
      else {
        ctx.globalCompositeOperation = 'destination-in'
        ctx.fillStyle = `rgba(0,0,0,${FADE})`
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'source-over'
      }
      const stretch = moving ? MOVE_STREAK : 1
      ctx.lineWidth = 1.4 * dpr
      for (let b = 0; b < BUCKETS.length; b++) {
        const lo = b === 0 ? 0 : BUCKETS[b - 1]
        ctx.beginPath()
        for (let i = 0; i < field.n; i++) {
          const sp = field.speed[i]
          if (sp < lo || sp >= BUCKETS[b] || field.age[i] === 0) continue
          const p0 = map.project([field.plon[i], field.plat[i]])
          const p1 = map.project([field.lon[i], field.lat[i]])
          ctx.moveTo((p1.x + (p0.x - p1.x) * stretch) * dpr, (p1.y + (p0.y - p1.y) * stretch) * dpr)
          ctx.lineTo(p1.x * dpr, p1.y * dpr)
        }
        ctx.strokeStyle = COLORS[b]
        ctx.stroke()
      }
    }
    const onStart = () => {
      moving = true
    }
    const onEnd = () => {
      moving = false
      clear() // 從乾淨畫面重新累積長拖尾；粒子不重撒，畫面連續
      field.setBounds(viewBounds(map))
    }
    const onResize = () => {
      resize()
      onEnd()
    }
    map.on('movestart', onStart)
    map.on('moveend', onEnd)
    map.on('resize', onResize)
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      map.off('movestart', onStart)
      map.off('moveend', onEnd)
      map.off('resize', onResize)
      clear()
    }
  }, [map, canvas, grid, enabled, maxParticles])
  return null
}
