import { useStore, type LayerKey } from '../store'
import { Panel } from './Panel'
import s from './LayerPanel.module.css'

const ITEMS: { key: LayerKey; label: string; en: string }[] = [
  { key: 'sst', label: '海表溫度', en: 'SST' },
  { key: 'anomaly', label: '海溫異常', en: 'ANOM' },
  { key: 'currents', label: '洋流', en: 'CURRENT' },
  { key: 'hotspot', label: '海況熱區（示意）', en: 'HOTSPOT' },
  { key: 'buoys', label: 'FAD 浮標', en: 'FAD' },
  { key: 'others', label: '周邊船隻（模擬）', en: 'AIS' },
  { key: 'fleet', label: '自家船隊', en: 'FLEET' },
  { key: 'track', label: '航次軌跡', en: 'TRACK' },
]

export function LayerPanel() {
  const layers = useStore((st) => st.layers)
  const toggle = useStore((st) => st.toggleLayer)
  const setLayer = useStore((st) => st.setLayer)
  const onClick = (k: LayerKey) => {
    // 海溫與異常二選一
    if (k === 'sst' && !layers.sst) setLayer('anomaly', false)
    if (k === 'anomaly' && !layers.anomaly) setLayer('sst', false)
    toggle(k)
  }
  return (
    <Panel title="圖層" en="LAYERS">
      <div className={s.list}>
        {ITEMS.map((it) => (
          <button key={it.key} className={s.item} aria-pressed={layers[it.key]} onClick={() => onClick(it.key)}>
            <span className={s.box} />
            {it.label}
            <span className={s.en}>{it.en}</span>
          </button>
        ))}
      </div>
    </Panel>
  )
}
