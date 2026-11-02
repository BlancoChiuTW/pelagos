// 資料標示（F10）：每個圖層的來源與資料時間；模擬資料明確標「模擬」
import type { OceanGrid } from '../data/types'
import { Panel } from './Panel'
import s from './SourceBadge.module.css'

const day = (iso: string) => iso.slice(0, 10)

export function SourceBadge({ grid, error }: { grid: OceanGrid | null; error?: string }) {
  return (
    <Panel title="資料來源" en="SOURCES">
      <div className={s.list}>
        {error && <div className={s.err}>海況資料載入失敗：{error}</div>}
        <div className={s.row}><b>海溫／異常</b><span>NOAA OISST · {grid ? day(grid.meta.sst.time) : '—'}</span></div>
        <div className={s.row}><b>洋流</b><span>NOAA NESDIS SSH · {grid ? day(grid.meta.u.time) : '—'}</span></div>
        <div className={s.row}><b>船隊／航次／浮標</b><span className={s.sim}>模擬資料</span></div>
        <div className={s.row}><b>周邊船隻</b><span className={s.sim}>模擬（壓力測試）</span></div>
        <div className={s.row}><b>陸地／底圖</b><span>Natural Earth · CARTO</span></div>
      </div>
    </Panel>
  )
}
