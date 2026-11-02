import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { FleetItem } from '../data/useFleet'
import { STATUS_LABEL } from '../sim/status'
import { useStore, type View } from '../store'
import { Icon } from './icons'
import s from './Toolbar.module.css'

const TITLES: Record<View, string> = { map: '戰情總覽', vessels: '船舶管理', trips: '航次紀錄', buoys: 'FAD 浮標', alerts: '警示中心', data: '資料串接' }

export function Toolbar({ fleet, layers, info }: { fleet: FleetItem[]; layers: ReactNode; info: ReactNode }) {
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState<'layers' | 'info' | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const search = useRef<HTMLDivElement>(null)
  const menus = useRef<HTMLDivElement>(null)
  const view = useStore((st) => st.view)
  const select = useStore((st) => st.selectVessel)
  const setView = useStore((st) => st.setView)
  const replayOpen = useStore((st) => st.replayOpen)
  const setReplay = useStore((st) => st.setReplayOpen)
  const hits = q.trim() ? fleet.filter((f) => f.vessel.name.includes(q.trim()) || f.vessel.id.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : []
  const pick = (f: FleetItem) => { select(f.vessel.id); setView('map'); setQ(''); setFocused(false); input.current?.blur() }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.current?.focus() }
      if (e.key === 'Escape') { setOpen(null); setFocused(false); input.current?.blur() }
    }
    const outside = (e: PointerEvent) => {
      if (!menus.current?.contains(e.target as Node)) setOpen(null)
      if (!search.current?.contains(e.target as Node)) setFocused(false)
    }
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', outside)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', outside) }
  }, [])
  const showing = focused && q.trim().length > 0
  return (
    <header className={s.bar}>
      <div className={s.title}><span>船隊營運工作區 <i>/</i></span><strong>{TITLES[view]}</strong></div>
      <span className={s.demo}>示範資料</span>
      <div className={s.search} ref={search}>
        <label className={s.field}>
          {Icon.search}
          <input ref={input} role="combobox" aria-label="搜尋船名或編號" aria-autocomplete="list" aria-expanded={showing} aria-controls="vessel-search-results" aria-activedescendant={showing && hits[active] ? 'search-' + hits[active].vessel.id : undefined}
            value={q} onFocus={() => setFocused(true)} onChange={(e) => { setQ(e.target.value); setActive(0); setFocused(true) }} placeholder="搜尋船隊…"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((n) => Math.min(n + 1, hits.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive((n) => Math.max(0, n - 1)) }
              if (e.key === 'Enter' && hits[active]) { e.preventDefault(); pick(hits[active]) }
            }} />
          {q ? <button className={s.clear} aria-label="清除搜尋" onClick={() => { setQ(''); input.current?.focus() }}>{Icon.close}</button> : <kbd>⌘ / Ctrl K</kbd>}
        </label>
        {showing && <div className={s.results} id="vessel-search-results" role="listbox" aria-label="搜尋結果">
          <div className={s.resultHead}>{hits.length ? '選擇船舶以定位' : '沒有符合的船舶'}</div>
          {hits.map((f, i) => (
            <button role="option" aria-selected={active === i} id={'search-' + f.vessel.id} key={f.vessel.id} className={s.result} onClick={() => pick(f)}>
              <span>{Icon.ship}<b>{f.vessel.name}<small>{f.vessel.id}</small></b></span><span>{STATUS_LABEL[f.status]}</span>
            </button>
          ))}
          {!hits.length && <p className={s.noResults}>試試船名「藍潮」或船舶編號。</p>}
        </div>}
      </div>
      <div className={s.menus} ref={menus}>
        {view === 'map' && <button className={s.btn} aria-expanded={open === 'layers'} aria-controls="workspace-popover" onClick={() => setOpen(open === 'layers' ? null : 'layers')}>{Icon.layers}<span>圖層</span></button>}
        <button className={s.btn} aria-expanded={open === 'info'} aria-controls="workspace-popover" onClick={() => setOpen(open === 'info' ? null : 'info')}>{Icon.info}<span>資訊</span></button>
        {open && <div className={s.pop} id="workspace-popover" role="region" aria-label={open === 'layers' ? '地圖圖層' : '資料資訊'}>
          <div className={s.popHead}><b>{open === 'layers' ? '地圖圖層' : '資料與顯示'}</b><button aria-label="關閉選單" className={s.clear} onClick={() => setOpen(null)}>{Icon.close}</button></div>
          {open === 'layers' ? layers : info}
        </div>}
      </div>
      {view === 'map' && <button className={s.btn} aria-expanded={replayOpen} onClick={() => setReplay(!replayOpen)}>{Icon.replay}<span>回放</span></button>}
    </header>
  )
}
