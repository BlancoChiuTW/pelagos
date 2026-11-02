import type { CSSProperties, ReactNode } from 'react'
import s from './Panel.module.css'

interface Props {
  title?: string
  /** 標題右側小字英文（例：LAYERS） */
  en?: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function Panel({ title, en, className, style, children }: Props) {
  return (
    <section className={`${s.panel} ${className ?? ''}`} style={style}>
      {title && (
        <h2 className={s.title}>
          <span>{title}</span>
          {en && <em>{en}</em>}
        </h2>
      )}
      {children}
    </section>
  )
}
