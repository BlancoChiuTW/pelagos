// MapLibre 底圖 + deck.gl（MapboxOverlay，非 interleaved）＋洋流 canvas 夾層（TECH_SPEC §6）
import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { Layer, PickingInfo } from '@deck.gl/core'
import { BASEMAP_STYLE, INTRO_START } from './camera'
// MapLibre 6 用 import.meta.url 找 worker，打包後找不到 → 用 Vite ?url 把 worker 檔當資產輸出再指定
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

maplibregl.setWorkerUrl(workerUrl)

export interface MapHandles {
  map: maplibregl.Map
  overlay: MapboxOverlay
  /** 夾在 MapLibre 畫布與 deck 畫布之間，給洋流粒子用 */
  fxCanvas: HTMLCanvasElement
}

type Tooltip = (info: PickingInfo) => { html: string } | null

interface Props {
  layers: Layer[]
  getTooltip?: Tooltip
  onReady?: (h: MapHandles) => void
}

export function MapView({ layers, getTooltip, onReady }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<MapboxOverlay | null>(null)

  useEffect(() => {
    if (!el.current) return
    const map = new maplibregl.Map({
      container: el.current,
      style: BASEMAP_STYLE,
      center: INTRO_START.center, // 開機序列從高空俯衝到 DEFAULT_VIEW（X01）
      zoom: INTRO_START.zoom,
      renderWorldCopies: true,
      // 條款要求標示 GFW 出處（周邊漁船活動）
      attributionControl: { compact: true, customAttribution: 'Fishing activity © Global Fishing Watch · EEZ © Marine Regions (VLIZ, CC BY 4.0)' },
    })
    const overlay = new MapboxOverlay({ interleaved: false, layers: [] })
    overlayRef.current = overlay
    map.addControl(overlay)

    const fxCanvas = document.createElement('canvas')
    fxCanvas.className = 'pelagos-fx-canvas'
    Object.assign(fxCanvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' })

    map.on('load', () => {
      // deck 的畫布在 overlay 掛上後才存在；把洋流 canvas 插在它前面（= 它下面）
      const container = map.getContainer()
      const deckCanvas = container.querySelector('canvas:not(.maplibregl-canvas)')
      if (deckCanvas?.parentElement) deckCanvas.parentElement.insertBefore(fxCanvas, deckCanvas)
      else container.appendChild(fxCanvas)
      onReady?.({ map, overlay, fxCanvas })
    })

    return () => {
      overlayRef.current = null
      map.remove()
    }
    // onReady 只在掛載時用一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    overlayRef.current?.setProps({ layers, getTooltip })
  }, [layers, getTooltip])

  return <div ref={el} style={{ position: 'absolute', inset: 0 }} />
}
