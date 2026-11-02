import { useEffect, useState } from 'react'
import { useStore, type View } from '../store'
import { Icon } from './icons'
import s from './Sidebar.module.css'

const ITEMS: { view: View; label: string; icon: keyof typeof Icon }[] = [
  { view: 'map', label: '戰情總覽', icon: 'map' },
  { view: 'vessels', label: '船舶管理', icon: 'ship' },
  { view: 'trips', label: '航次紀錄', icon: 'route' },
  { view: 'buoys', label: 'FAD 浮標', icon: 'buoy' },
  { view: 'alerts', label: '警示中心', icon: 'bell' },
  { view: 'data', label: '資料串接', icon: 'plug' },
]

export function Sidebar({ alerts }: { alerts: number }) {
  const view = useStore((st) => st.view)
  const setView = useStore((st) => st.setView)
  const online = useStore((st) => st.online)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(id)
  }, [])
  const hhmm = new Date(now).toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, hour: '2-digit', minute: '2-digit' })
  return (
    <nav className={s.rail} aria-label="主要導覽">
      <button className={s.brand} onClick={() => setView('map')} aria-label="PELAGOS 戰情總覽">
        <span className={s.logo}><svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true"><path d="M4 16 13 4l9 12-9-4-9 4Z" stroke="currentColor" strokeWidth="1.4"/><path d="m4 21 9-4 9 4" stroke="currentColor" strokeWidth="1.4"/></svg></span>
        <span className={s.wordmark}>PELAGOS<small>FLEET WORKSPACE</small></span>
      </button>
      <div className={s.workspace}><span className={s.avatar}>藍</span><div>藍潮漁業<small>船隊營運工作區</small></div></div>
      <div className={s.caption}>工作空間</div>
      <div className={s.navItems}>
        {ITEMS.map((it) => (
          <button key={it.view} className={s.item} title={it.label} aria-label={it.label} aria-current={view === it.view ? 'page' : undefined} onClick={() => setView(it.view)}>
            {Icon[it.icon]}<span className={s.itemLabel}>{it.label}</span>
            {it.view === 'alerts' && alerts > 0 && <span className={s.badge}>{alerts}</span>}
          </button>
        ))}
      </div>
      <div className={s.spacer} />
      <div className={s.demo}><span>探索中的營運提案</span><small>模擬船隊 · 真實海況</small></div>
      <div className={s.status}>
        <span className={s.dot} data-off={!online} title={online ? '瀏覽器網路連線正常' : '瀏覽器離線'} />
        <span className="num">{hhmm}</span><span className={s.zone}>台北時間</span>
      </div>
    </nav>
  )
}
