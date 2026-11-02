// 上方工具列（V03）：搜尋船名、圖層選單、資訊（圖例、資料來源、展示模式）
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { FleetItem } from '../data/useFleet'
import { STATUS_LABEL } from '../sim/status'
import { useStore } from '../store'
import { Icon } from './icons'
import s from './Toolbar.module.css'

function Popover({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const off = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('pointerdown', off)
    return () => window.removeEventListener('pointerdown', off)
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className={`${s.glass} ${s.btn}`} aria-expanded={open} onClick={() => setOpen(!open)}>{icon}{label}</button>
      {open && <div className={`${s.glass} ${s.pop}`}>{children}</div>}
    </div>
  )
}

export function Toolbar({ fleet, layers, info }: { fleet: FleetItem[]; layers: ReactNode; info: ReactNode }) {
  const [q, setQ] = useState('')
  const select = useStore((st) => st.selectVessel)
  const replayOpen = useStore((st) => st.replayOpen)
  const setReplay = useStore((st) => st.setReplayOpen)
  const hits = q.trim() ? fleet.filter((f) => f.vessel.name.includes(q.trim()) || f.vessel.id.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : []
  return (
    <div className={s.bar}>
      <div className={`${s.glass} ${s.search}`}>
        <label className={s.field}>
          {Icon.search}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋船名或編號" />
        </label>
        {hits.length > 0 && (
          <div className={`${s.glass} ${s.results}`}>
            {hits.map((f) => (
              <button key={f.vessel.id} className={s.result} onClick={() => { select(f.vessel.id); setQ('') }}>
                <span>{f.vessel.name}</span><span>{STATUS_LABEL[f.status]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Popover label="圖層" icon={Icon.layers}>{layers}</Popover>
      <Popover label="資訊" icon={Icon.info}>{info}</Popover>
      <button className={`${s.glass} ${s.btn}`} aria-expanded={replayOpen} onClick={() => setReplay(!replayOpen)}>{Icon.replay}回放</button>
    </div>
  )
}
