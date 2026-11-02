// 介面主控台（M03）：像 HIS 的介面引擎畫面——接收開關、統計、訊息紀錄、原始訊息 → 解析結果 → 欄位對應
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Parsed } from '../data/interfaces/formats'
import s from './Page.module.css'

export interface Msg { id: number; at: number; label: string; raw: string; parsed: Parsed }

/** 訊息來源：make 產生一筆原始訊息（模擬對方系統），parse 驗證解析，onAccept 寫入系統 */
export function useFeed(make: () => { label: string; raw: string } | null, parse: (raw: string) => Parsed, onAccept?: (f: Record<string, string | number>) => void, everyMs = 2500) {
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<Msg[]>([])
  const seq = useRef(0)
  const ref = useRef({ make, parse, onAccept })
  ref.current = { make, parse, onAccept }
  const pull = useCallback(() => {
    const m = ref.current.make()
    if (!m) return
    const parsed = ref.current.parse(m.raw)
    if (parsed.ok) ref.current.onAccept?.(parsed.fields)
    setLog((l) => [{ id: ++seq.current, at: Date.now(), label: m.label, raw: m.raw, parsed }, ...l].slice(0, 80))
  }, [])
  useEffect(() => {
    if (!running) return
    const id = setInterval(pull, everyMs)
    return () => clearInterval(id)
  }, [running, pull, everyMs])
  return { running, setRunning, pull, log }
}

interface Props {
  title: string
  desc: string
  feed: ReturnType<typeof useFeed>
  mapping: [string, string, string][]
  actions?: ReactNode
  auto?: boolean
}

export function InterfaceConsole({ title, desc, feed, mapping, actions, auto = true }: Props) {
  const [sel, setSel] = useState<number | null>(null)
  const ok = feed.log.filter((m) => m.parsed.ok).length
  const cur = feed.log.find((m) => m.id === sel) ?? feed.log[0]
  const mono = { font: '12px/17px ui-monospace, "SF Mono", Menlo, monospace', whiteSpace: 'pre-wrap' as const, wordBreak: 'break-all' as const, margin: 0 }
  const box = { padding: 12, borderRadius: 10, background: 'rgba(0,0,0,.35)', border: '0.5px solid var(--sep)' }
  return (
    <div>
      <div className={s.head} style={{ marginBottom: 10 }}>
        <div><div className={s.section} style={{ margin: 0 }}>{title}</div><div className={s.dim}>{desc}</div></div>
        <div className={s.grow} />
        {auto && <button className={`${s.btn} ${feed.running ? '' : s.primary}`} onClick={() => feed.setRunning(!feed.running)}>{feed.running ? '暫停接收' : '開始接收'}</button>}
        <button className={s.btn} onClick={feed.pull}>{auto ? '手動拉取一筆' : '接收一筆'}</button>
        {actions}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
        {[['已接收', feed.log.length, 'var(--label)'], ['解析成功', ok, 'var(--green)'], ['驗證失敗', feed.log.length - ok, 'var(--red)'], ['狀態', feed.running ? '接收中' : '待命', feed.running ? 'var(--green)' : 'var(--label-2)']].map(([k, v, c]) => (
          <div key={String(k)} style={box}><div className={s.dim}>{k}</div><div style={{ font: 'var(--t-title2)', color: String(c), fontVariantNumeric: 'tabular-nums' }}>{v}</div></div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12, minHeight: 300 }}>
        <div style={{ ...box, padding: 6, maxHeight: 420, overflowY: 'auto' }}>
          {!feed.log.length && <div className={s.dim} style={{ padding: 10 }}>尚無訊息。按「{auto ? '開始接收' : '接收一筆'}」。</div>}
          {feed.log.map((m) => (
            <button key={m.id} onClick={() => setSel(m.id)} style={{ display: 'flex', gap: 8, width: '100%', padding: '7px 8px', border: 0, borderRadius: 7, cursor: 'pointer', textAlign: 'left', background: cur?.id === m.id ? 'rgba(100,210,255,.14)' : 'none', font: 'var(--t-footnote)' }}>
              <span style={{ color: m.parsed.ok ? 'var(--green)' : 'var(--red)' }}>{m.parsed.ok ? '✓' : '✕'}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</span>
              <span className={s.dim}>{new Date(m.at).toLocaleTimeString('zh-TW', { hour12: false })}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <div style={box}><div className={s.dim} style={{ marginBottom: 6 }}>① 原始訊息</div><pre style={mono}>{cur ? cur.raw : '—'}</pre></div>
          <div style={box}>
            <div className={s.dim} style={{ marginBottom: 6 }}>② 解析與驗證</div>
            {!cur ? '—' : cur.parsed.ok ? (
              <dl className={s.kv}>{Object.entries(cur.parsed.fields).map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl>
            ) : <div style={{ color: 'var(--red)' }}>驗證失敗：{cur.parsed.error}（訊息退回、不寫入，記錄供對帳）</div>}
          </div>
          <div style={box}>
            <div className={s.dim} style={{ marginBottom: 6 }}>③ 欄位對應（來源 → 系統）</div>
            <table className={s.table} style={{ font: 'var(--t-footnote)' }}>
              <tbody>{mapping.map(([a, b, n]) => <tr key={a} style={{ cursor: 'default' }}><td style={{ fontFamily: 'ui-monospace, monospace' }}>{a}</td><td>→ {b}</td><td className={s.dim}>{n}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
