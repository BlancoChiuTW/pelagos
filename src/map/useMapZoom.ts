import { useEffect, useState } from 'react'
import type * as maplibregl from 'maplibre-gl'

/** 地圖縮放層級（移動結束才更新，避免拖動時重組圖層） */
export function useMapZoom(map: maplibregl.Map | null): number {
  const [z, setZ] = useState(3)
  useEffect(() => {
    if (!map) return
    const on = () => setZ(map.getZoom())
    on()
    map.on('zoomend', on)
    return () => {
      map.off('zoomend', on)
    }
  }, [map])
  return z
}
