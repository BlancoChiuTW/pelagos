import type { Map as MapLibreMap } from 'maplibre-gl'
import { homeView } from '../map/camera'
import { useStore } from '../store'
import { Icon } from './icons'
import s from './MapControls.module.css'

export function MapControls({ map }: { map: MapLibreMap | null }) {
  const reset = () => {
    useStore.getState().selectVessel(null)
    map?.easeTo({ ...homeView(), duration: 900 })
  }
  return <>
    <div className={s.controls} aria-label="地圖控制">
      <button aria-label="放大地圖" title="放大地圖" disabled={!map} onClick={() => map?.zoomIn({ duration: 250 })}>+</button>
      <button aria-label="縮小地圖" title="縮小地圖" disabled={!map} onClick={() => map?.zoomOut({ duration: 250 })}>−</button>
      <span />
      <button aria-label="返回船隊總覽" title="返回船隊總覽" disabled={!map} onClick={reset}>{Icon.map}</button>
    </div>
    <div className={s.hint}>拖曳探索海域 <span>·</span> 滾輪縮放 <span>·</span> 點選船舶查看航次</div>
  </>
}
