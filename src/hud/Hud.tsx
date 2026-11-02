// v3 版面（V03）：導覽列與工具列由 App 放；這裡管右側情境面板、底部與管理頁容器
import type { ReactNode } from 'react'
import s from './Hud.module.css'

interface Slots { right?: ReactNode; bottom?: ReactNode; bottomLeft?: ReactNode; page?: ReactNode }

export function Hud({ right, bottom, bottomLeft, page }: Slots) {
  if (page) return <div className={s.hud}><div className={s.page}>{page}</div></div>
  return (
    <div className={s.hud}>
      <div className={s.right}>{right}</div>
      {bottom && <div className={s.bottom}>{bottom}</div>}
      {bottomLeft && <div className={s.bottomLeft}>{bottomLeft}</div>}
    </div>
  )
}
