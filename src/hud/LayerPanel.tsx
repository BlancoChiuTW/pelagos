import { useStore, type LayerKey } from '../store'
import s from './LayerPanel.module.css'

const GROUPS: { title: string; items: { key: LayerKey; label: string }[] }[] = [
  { title: '船隊', items: [{ key: 'fleet', label: '自家船隊' }, { key: 'track', label: '航跡（24 小時）' }, { key: 'others', label: '周邊船隻（模擬）' }] },
  { title: '海況', items: [{ key: 'sst', label: '海表溫度' }, { key: 'anomaly', label: '海溫異常' }, { key: 'currents', label: '洋流' }] },
  { title: '漁場', items: [{ key: 'buoys', label: 'FAD 浮標' }, { key: 'hotspot', label: '海況熱區（示意）' }] },
]

export function LayerPanel() {
  const layers = useStore((st) => st.layers)
  const toggle = useStore((st) => st.toggleLayer)
  const setLayer = useStore((st) => st.setLayer)
  const onClick = (k: LayerKey) => {
    if (k === 'sst' && !layers.sst) setLayer('anomaly', false)
    if (k === 'anomaly' && !layers.anomaly) setLayer('sst', false)
    toggle(k)
  }
  return (
    <div>
      {GROUPS.map((g) => (
        <div key={g.title}>
          <div className={s.group}>{g.title}</div>
          {g.items.map((it) => (
            <button key={it.key} className={s.item} disabled={it.key === 'hotspot'} aria-pressed={layers[it.key]} onClick={() => onClick(it.key)}>
              {it.label}{it.key === 'hotspot' ? <small>規劃中</small> : <span className={s.switch} />}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
