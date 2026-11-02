// 「資訊」選單（V03）：圖例、資料來源、展示模式開關。常駐面板都收進這裡（視覺減法）
import { useStore } from '../store'
import type { OceanGrid } from '../data/types'
import s from './LayerPanel.module.css'

const SST = 'linear-gradient(90deg,#081d58,#253494 28.6%,#225ea8 47.6%,#1d91c0 61.9%,#41b6c4 76.2%,#7fcdbb 85.7%,#edf8b1 90.5%,#fec44f 95.2%,#f03b20)'
const day = (iso: string) => iso.slice(0, 10)

export function InfoPanel({ grid }: { grid: OceanGrid | null }) {
  const demo = useStore((st) => st.demoMode)
  const setDemo = useStore((st) => st.setDemoMode)
  const row = { display: 'flex', justifyContent: 'space-between', gap: 8, font: 'var(--t-footnote)', padding: '3px 4px' } as const
  return (
    <div>
      <div className={s.group}>海表溫度 °C</div>
      <div style={{ height: 6, borderRadius: 3, background: SST, margin: '0 4px' }} />
      <div style={{ ...row, color: 'var(--label-2)', font: 'var(--t-caption2)' }}><span>10</span><span>20</span><span>26</span><span>31</span></div>
      <div className={s.group}>資料來源</div>
      <div style={row}><span>海溫／異常</span><span style={{ color: 'var(--label-2)' }}>NOAA OISST · {grid ? day(grid.meta.sst.time) : '—'}</span></div>
      <div style={row}><span>洋流</span><span style={{ color: 'var(--label-2)' }}>NOAA NESDIS · {grid ? day(grid.meta.u.time) : '—'}</span></div>
      <div style={row}><span>船隊／航次／浮標</span><span style={{ color: 'var(--orange)' }}>模擬資料</span></div>
      <div style={row}><span>陸地／底圖</span><span style={{ color: 'var(--label-2)' }}>Natural Earth · CARTO</span></div>
      <div className={s.group}>展示</div>
      <button className={s.item} aria-pressed={demo} onClick={() => setDemo(!demo)}>展示模式（效能 HUD）<span className={s.switch} /></button>
    </div>
  )
}
