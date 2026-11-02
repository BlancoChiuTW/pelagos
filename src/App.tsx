import { useMemo, useState } from 'react'
import type { Layer } from '@deck.gl/core'
import { MapView, type MapHandles } from './map/MapView'

// 骨架：之後由 map/layerStack.ts 依 store 組出圖層，HUD 元件疊在地圖上
export default function App() {
  const [, setHandles] = useState<MapHandles | null>(null)
  const layers = useMemo<Layer[]>(() => [], [])
  return <MapView layers={layers} onReady={setHandles} />
}
