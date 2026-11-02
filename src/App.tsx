import { useEffect, useMemo, useState } from 'react'
import type { Layer } from '@deck.gl/core'
import { MapView, type MapHandles } from './map/MapView'
import { Hud } from './hud/Hud'
import { LayerPanel } from './hud/LayerPanel'
import { Legend } from './hud/Legend'
import { Readout } from './hud/Readout'
import { useOcean } from './data/useOcean'
import { mountOceanRasters, setRasterVisible } from './layers/sst'
import { useStore } from './store'

export default function App() {
  const [h, setHandles] = useState<MapHandles | null>(null)
  const ocean = useOcean()
  const showSst = useStore((s) => s.layers.sst)
  const showAnom = useStore((s) => s.layers.anomaly)
  const grid = ocean.state === 'ok' ? ocean.data : null

  useEffect(() => {
    if (h && grid) mountOceanRasters(h.map, grid)
  }, [h, grid])
  useEffect(() => {
    if (!h || !grid) return
    setRasterVisible(h.map, 'sst', showSst)
    setRasterVisible(h.map, 'anomaly', showAnom, 0.85)
  }, [h, grid, showSst, showAnom])

  const layers = useMemo<Layer[]>(() => [], [])
  return (
    <>
      <MapView layers={layers} onReady={setHandles} />
      <Hud
        left={<LayerPanel />}
        bottomLeft={
          <>
            {h && grid && <Readout map={h.map} ocean={grid} />}
            {grid && <Legend />}
          </>
        }
      />
    </>
  )
}
