import { Fragment } from 'react'
import { useStore, type LayerKey } from '../store'
import s from './LayerPanel.module.css'

const GROUPS: { title: string; items: { key: LayerKey; label: string }[] }[] = [
  { title: '船隊', items: [{ key: 'fleet', label: '自家船隊' }, { key: 'track', label: '航跡（24 小時）' }, { key: 'gfw', label: '周邊漁船活動（GFW）' }, { key: 'ports', label: '港口與停靠（GFW）' }, { key: 'activity', label: '可疑活動：相遇、徘徊（GFW）' }, { key: 'aisgap', label: 'AIS 刻意關閉（GFW）' }] },
  { title: '海域', items: [{ key: 'eez', label: '經濟海域 EEZ／PNA 入漁區' }] },
  { title: '海況', items: [{ key: 'sst', label: '海表溫度' }, { key: 'anomaly', label: '海溫異常' }, { key: 'currents', label: '洋流' }] },
  { title: '漁場', items: [{ key: 'buoys', label: 'FAD 浮標' }, { key: 'hotspot', label: '海況熱區（示意）' }] },
]

import { GEAR_LABEL } from '../layers/gfw'

export function LayerPanel({ gears = [] }: { gears?: string[] }) {
  const gear = useStore((st) => st.gfwGear)
  const setGear = useStore((st) => st.setGfwGear)
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
            <Fragment key={it.key}>
            <button className={s.item} disabled={it.key === 'hotspot'} aria-pressed={layers[it.key]} onClick={() => onClick(it.key)}>
              {it.label}{it.key === 'hotspot' ? <small>規劃中</small> : <span className={s.switch} />}
            </button>
            {it.key === 'gfw' && layers.gfw && gears.length > 0 && (
              <select value={gear} onChange={(e) => setGear(e.target.value)} aria-label="漁具篩選"
                style={{ margin: '0 4px 6px', width: 'calc(100% - 8px)', height: 30, borderRadius: 8, border: 0, background: 'var(--fill)', color: 'var(--label)', font: 'var(--t-footnote)', padding: '0 8px' }}>
                <option value="pelagic">遠洋漁業（圍網、延繩釣、魷釣）</option>
                <option value="all">全部漁具（含沿岸拖網）</option>
                {gears.map((g) => <option key={g} value={g}>{GEAR_LABEL[g] ?? g}</option>)}
              </select>
            )}
            </Fragment>
          ))}
        </div>
      ))}
    </div>
  )
}
