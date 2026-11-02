// 管理頁的暫時內容（M01–M05 完成後取代）
import type { View } from '../store'
import { Panel } from '../hud/Panel'

const TITLE: Record<View, string> = { map: '戰情', vessels: '船舶管理', trips: '航次管理', buoys: '浮標', alerts: '警示中心', data: '資料串接' }

export function Placeholder({ view }: { view: View }) {
  return (
    <Panel style={{ height: '100%' }}>
      <div style={{ font: 'var(--t-title1)' }}>{TITLE[view]}</div>
      <div style={{ font: 'var(--t-subhead)', color: 'var(--label-2)', marginTop: 8 }}>建置中</div>
    </Panel>
  )
}
