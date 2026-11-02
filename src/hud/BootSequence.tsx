// 開機序列（X01）：逐字打出系統名稱 → 綁真實載入狀態 → 全部就緒後交給導演做俯衝與點亮
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type * as maplibregl from 'maplibre-gl'
import { playReveal, skipToEnd } from '../fx/director'
import s from './BootSequence.module.css'

const TITLE = 'PELAGOS'
const SUB = '藍潮漁業  船隊戰情系統'

interface Step { label: string; ok: boolean }

function Mark({ ok }: { ok: boolean }) {
  return ok ? (
    <svg className={s.mark} viewBox="0 0 16 16"><path d="M3 8.5l3 3 7-7" fill="none" stroke="var(--ok)" strokeWidth="1.8" /></svg>
  ) : (
    <svg className={`${s.mark} ${s.spin}`} viewBox="0 0 16 16"><path d="M8 2a6 6 0 1 1-6 6" fill="none" stroke="var(--accent)" strokeWidth="1.6" /></svg>
  )
}

export function BootSequence({ map, steps, onDone }: { map: maplibregl.Map | null; steps: Step[]; onDone: () => void }) {
  const overlay = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState('')
  const [sub, setSub] = useState('')
  const [typed, setTyped] = useState(false)
  /** 載入狀態逐行出現的行數；全部出現後再停 0.4 秒才俯衝（本機資料太快，否則文字一閃而過） */
  const [shown, setShown] = useState(0)
  const [held, setHeld] = useState(false)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const ready = map !== null && steps.every((x) => x.ok)

  useEffect(() => {
    if (!typed) return
    if (shown < steps.length) {
      const id = setTimeout(() => setShown((n) => n + 1), 280)
      return () => clearTimeout(id)
    }
    const id = setTimeout(() => setHeld(true), 400)
    return () => clearTimeout(id)
  }, [typed, shown, steps.length])

  // 第一段：逐字打字
  useEffect(() => {
    const p = { a: 0, b: 0 }
    const t = gsap.timeline({ onComplete: () => setTyped(true) })
    t.to(p, { a: TITLE.length, duration: 0.45, ease: 'none', onUpdate: () => setTitle(TITLE.slice(0, Math.round(p.a))) })
    t.to(p, { b: SUB.length, duration: 0.35, ease: 'none', onUpdate: () => setSub(SUB.slice(0, Math.round(p.b))) })
    return () => {
      t.kill()
    }
  }, [])

  // 第二段：打完字且資料就緒 → 俯衝與點亮
  useEffect(() => {
    if (!held || !ready || !map || !overlay.current || tl.current) return
    tl.current = playReveal(map, overlay.current, onDone)
  }, [held, ready, map, onDone])

  // 任意鍵或點擊跳過（資料沒到不能跳，否則畫面是空的）
  useEffect(() => {
    const skip = () => {
      if (!ready || !map) return
      tl.current?.kill()
      skipToEnd(map)
      onDone()
    }
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    return () => {
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [ready, map, onDone])

  return (
    <div ref={overlay} className={s.overlay}>
      <div className={s.box}>
        <div className={s.logo}>{title}{!typed && <span className={s.cursor} />}</div>
        <div className={s.sub}>{sub}</div>
        <div className={s.lines}>
          {steps.slice(0, shown).map((x) => (
            <div key={x.label} className={s.line} data-ok={x.ok}><Mark ok={x.ok} />{x.label}{x.ok ? ' 已就緒' : ' 載入中'}</div>
          ))}
        </div>
        {typed && <div className={s.hint}>{ready ? '按任意鍵略過' : '資料載入中…'}</div>}
      </div>
    </div>
  )
}
