import type { Port } from '../data/types'
import type { ActivityCluster } from '../layers/activity'
import { Panel } from './Panel'
import s from '../pages/Page.module.css'

export type Feature = Port | ActivityCluster
export function FeatureCard({ feature, onClose }: { feature: Feature; onClose: () => void }) {
  const port = 'visits' in feature ? feature : null
  const cluster = 'events' in feature ? feature : null
  return <Panel style={{ overflowY: 'auto', padding: 20 }}>
    <div className={s.head}><h2 className={s.h1}>{port?.name ?? `此區 ${cluster?.events.length} 起活動`}</h2><button className={s.btn} onClick={onClose}>關閉詳情</button></div>
    <p className={s.sub}>Global Fishing Watch · 歷史彙整資料</p>
    {port && <dl className={s.kv}><dt>國家</dt><dd>{port.country}</dd><dt>進港次數</dt><dd>{port.visits}</dd><dt>船舶數</dt><dd>{port.vessels}</dd><dt>漁船／運搬船進港</dt><dd>{port.fishing}／{port.carrier}</dd><dt>停靠中位數</dt><dd>{port.medianHrs ?? '—'} 小時</dd><dt>主要船籍</dt><dd>{port.topFlags.map(([f, n]) => `${f} ${n}`).join('、')}</dd></dl>}
    {cluster && <div>{cluster.events.map(e => <article key={e.id} style={{ borderBottom: '1px solid var(--sep)', padding: '14px 0' }}><b>{e.kind === 'encounter' ? e.encounterType === 'transshipment' ? '疑似海上轉載' : '海上加油' : e.kind === 'gap' ? 'AIS 斷訊' : '運搬船徘徊'}</b><p className={s.sub}>{new Date(e.start).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })} ～ {new Date(e.end).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}（台北）</p><div>船籍 {(e.flags ?? [e.flag]).join('／') || '—'}{e.hours != null && ` · ${e.hours} 小時`}</div></article>)}</div>}
    <p className={s.sub}>活動指標供檢視參考，並非違規判定。資料期間可於左上展開查看。</p>
  </Panel>
}
