// v3 版面（V03）：導覽列與工具列由 App 放；這裡管右側情境面板、底部與管理頁容器
import { useEffect, useState, type ReactNode } from 'react'
import s from './Hud.module.css'

interface Slots { selectionKey?: string; right?: ReactNode; bottom?: ReactNode; bottomLeft?: ReactNode; page?: ReactNode }

export function Hud({ right, bottom, bottomLeft, page, selectionKey }: Slots) {
  const [drawer, setDrawer] = useState('summary')
  useEffect(() => { if (selectionKey) setDrawer('detail') }, [selectionKey])
  if (page) return <div className={s.hud}><div className={s.page}>{page}</div></div>
  return (
    <div className={s.hud}>
      <div className={s.right} data-drawer={drawer}><div className={s.drawerBar} aria-label="情境面板高度">{[['collapsed', '收起'], ['summary', '摘要'], ['detail', '詳情']].map(([key, label]) => <button key={key} aria-pressed={drawer === key} onClick={() => setDrawer(key)}>{label}</button>)}</div><div className={s.drawerBody}>{right}</div></div>
      {bottom && <div className={s.bottom}>{bottom}</div>}
      {bottomLeft && <div className={s.bottomLeft}>{bottomLeft}</div>}
    </div>
  )
}
