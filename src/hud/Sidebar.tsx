// 左側導覽列（V03）：Apple 側邊欄的精簡圖示版
import { useEffect, useState } from 'react'
import { useStore, type View } from '../store'
import { Icon } from './icons'
import s from './Sidebar.module.css'

const ITEMS: { view: View; label: string; icon: keyof typeof Icon }[] = [
  { view: 'map', label: '戰情', icon: 'map' },
  { view: 'vessels', label: '船舶', icon: 'ship' },
  { view: 'trips', label: '航次', icon: 'route' },
  { view: 'buoys', label: '浮標', icon: 'buoy' },
  { view: 'alerts', label: '警示', icon: 'bell' },
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
      <div className={s.logo} title="PELAGOS">P</div>
      {ITEMS.map((it) => (
        <button key={it.view} className={s.item} aria-current={view === it.view ? 'page' : undefined} onClick={() => setView(it.view)}>
          {Icon[it.icon]}
          {it.label}
          {it.view === 'alerts' && alerts > 0 && <span className={s.badge}>{alerts}</span>}
        </button>
      ))}
      <div className={s.spacer} />
      <div className={s.status}>
        <span className={s.dot} data-off={!online} />
        <span className="num">{hhmm}</span>
        <span>TPE</span>
      </div>
    </nav>
  )
}
