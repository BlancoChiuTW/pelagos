// HUD 版面骨架（F01）。各區塊的內容由後續任務的元件取代 placeholder。
import type { ReactNode } from 'react'
import { Panel } from './Panel'
import { TopBar } from './TopBar'
import s from './Hud.module.css'

interface Slots {
  left?: ReactNode
  right?: ReactNode
  card?: ReactNode
  bottom?: ReactNode
  bottomLeft?: ReactNode
  bottomRight?: ReactNode
}

const ph = (title: string, en: string) => (
  <Panel title={title} en={en}>
    <div className={s.placeholder}>—</div>
  </Panel>
)

export function Hud({ left, right, card, bottom, bottomLeft, bottomRight }: Slots) {
  return (
    <div className={s.hud}>
      <div className={s.top}><TopBar /></div>
      <div className={s.left}>{left ?? ph('圖層', 'LAYERS')}</div>
      <div className={s.right}>{right ?? <>{ph('船隊總覽', 'FLEET')}{ph('事件警示', 'ALERTS')}</>}</div>
      <div className={s.card}>{card}</div>
      <div className={s.bottom}>{bottom ?? ph('時間軸', 'TIMELINE')}</div>
      <div className={s.bottomLeft}>{bottomLeft}</div>
      <div className={s.bottomRight}>{bottomRight}</div>
    </div>
  )
}
