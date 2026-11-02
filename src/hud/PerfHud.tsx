// 效能 HUD（F09）：FPS（1 秒移動平均）、繪製點數、周邊船數切換（壓力測試）
import { useEffect, useRef, useState } from 'react'
import { useStore, type OthersCount } from '../store'
import { Panel } from './Panel'
import s from './PerfHud.module.css'

/** 共用的 FPS 量測（X08 自動降級也讀這個） */
export function useFps(): number {
  const [fps, setFps] = useState(60)
  const frames = useRef<number[]>([])
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (t: number) => {
      frames.current.push(t)
      while (frames.current.length && frames.current[0] < t - 1000) frames.current.shift()
      if (t - last > 500) {
        setFps(frames.current.length)
        last = t
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return fps
}

const COUNTS: OthersCount[] = [10000, 50000, 100000]

export function PerfHud({ points, fps }: { points: number; fps: number }) {
  const count = useStore((st) => st.othersCount)
  const setCount = useStore((st) => st.setOthersCount)
  const color = fps >= 50 ? 'var(--ok)' : fps >= 30 ? 'var(--warn)' : 'var(--alert)'
  return (
    <Panel title="效能" en="PERFORMANCE" className={s.perf}>
      <div className={s.row}>
        <div><div className={s.fps} style={{ color }}>{fps}</div><div className={s.k}>FPS</div></div>
        <div><div style={{ fontSize: 16 }}>{points.toLocaleString('en-US')}</div><div className={s.k}>繪製點數</div></div>
      </div>
      <div className={s.btns}>
        {COUNTS.map((c) => (
          <button key={c} className={s.btn} aria-pressed={c === count} onClick={() => setCount(c)}>{c / 10000} 萬</button>
        ))}
      </div>
      <div className={s.note}>周邊船數（壓力測試，非實際船數）· Web Worker＋二進位傳輸</div>
    </Panel>
  )
}
