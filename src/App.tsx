import { useMemo, useState } from 'react'
import type { Layer } from '@deck.gl/core'
import { MapView, type MapHandles } from './map/MapView'
import { Hud } from './hud/Hud'

// 圖層由 map/layerStack.ts 依 store 組出（F02 起）；HUD 疊在地圖上
export default function App() {
  const [, setHandles] = useState<MapHandles | null>(null)
  const layers = useMemo<Layer[]>(() => [], [])
  return (
    <>
      <MapView layers={layers} onReady={setHandles} />
      <Hud />
    </>
  )
}
