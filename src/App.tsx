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
import { CurrentsCanvas } from './layers/currents/CurrentsCanvas'
import { useFleetItems, useFleetSnapshot } from './data/useFleet'
import { useOthers } from './sim/useOthers'
import { buildLayers } from './map/layerStack'
import { useMapZoom } from './map/useMapZoom'
import { useTicker } from './useTicker'

export default function App() {
  const [h, setHandles] = useState<MapHandles | null>(null)
  const ocean = useOcean()
  const showSst = useStore((s) => s.layers.sst)
  const showAnom = useStore((s) => s.layers.anomaly)
  const showCurrents = useStore((s) => s.layers.currents)
  const fxLow = useStore((s) => s.fx.quality === 'low')
  const grid = ocean.state === 'ok' ? ocean.data : null

  useEffect(() => {
    if (h && grid) mountOceanRasters(h.map, grid)
  }, [h, grid])
  useEffect(() => {
    if (!h || !grid) return
    setRasterVisible(h.map, 'sst', showSst)
    setRasterVisible(h.map, 'anomaly', showAnom, 0.8)
  }, [h, grid, showSst, showAnom])

  const layerFlags = useStore((s) => s.layers)
  const othersCount = useStore((s) => s.othersCount)
  const selectedId = useStore((s) => s.selectedVesselId)
  const selectVessel = useStore((s) => s.selectVessel)
  const now = useStore((s) => s.time.now)
  const t = useTicker(500)
  const zoom = useMapZoom(h?.map ?? null)
  const snap = useFleetSnapshot(grid, now)
  const fleet = useFleetItems(snap, t)
  const others = useOthers(grid, othersCount, t, layerFlags.others)

  const layers = useMemo<Layer[]>(
    () => buildLayers({ layers: layerFlags, zoom, fleet, others, selectedId, onSelect: selectVessel }),
    [layerFlags, zoom, fleet, others, selectedId, selectVessel],
  )
  return (
    <>
      <MapView layers={layers} onReady={setHandles} />
      {h && grid && <CurrentsCanvas map={h.map} canvas={h.fxCanvas} grid={grid} enabled={showCurrents} maxParticles={fxLow ? 3000 : 8000} />}
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
