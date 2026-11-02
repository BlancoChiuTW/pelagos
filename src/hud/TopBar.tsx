import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { Panel } from './Panel'
import s from './TopBar.module.css'

const fmtTpe = (t: number) =>
  new Date(t).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function TopBar() {
  const online = useStore((st) => st.online)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <Panel className={s.bar}>
      <div className={s.brand}>
        <span className={s.logo}>PELAGOS</span>
        <span className={s.sub}>藍潮漁業 船隊戰情系統</span>
      </div>
      <div className={s.spacer} />
      <div className={s.item}>
        <span className={s.dot} data-off={!online} />
        {online ? '連線中' : '離線'}
      </div>
      <div className={s.item}>
        <span className={s.clock}>{fmtTpe(now)}</span> TPE
      </div>
    </Panel>
  )
}
