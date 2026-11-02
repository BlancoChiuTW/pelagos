// 回放（F12）：平時收起；從工具列「回放」或詳情卡「回放航跡」展開。拖動回放過去 24 小時，播放 1／10／60 分鐘每秒
// 實務用途：事後調查（訊號中斷前往哪開、哪裡下網、越界爭議），不是常駐看板元素
import { useEffect } from 'react'
import { HOUR } from '../sim/geo'
import { fmtTime } from '../sim/labels'
import { useStore, type Speed } from '../store'
import { Panel } from './Panel'
import s from './TimeBar.module.css'

const SPEEDS: Speed[] = [1, 10, 60]

export function TimeBar({ live }: { live: number }) {
  const scrub = useStore((st) => st.scrub)
  const setScrub = useStore((st) => st.setScrub)
  const { playing, speed } = useStore((st) => st.time)
  const play = useStore((st) => st.play)
  const pause = useStore((st) => st.pause)
  const setSpeed = useStore((st) => st.setSpeed)
  const start = live - 24 * HOUR
  const t = scrub ?? live

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      const cur = useStore.getState().scrub ?? start
      const next = cur + speed * 60_000 * 0.1 // 每 100ms
      if (next >= Date.now()) {
        setScrub(null)
        pause()
      } else setScrub(next)
    }, 100)
    return () => clearInterval(id)
  }, [playing, speed, start, setScrub, pause])

  const toggle = () => {
    if (playing) return pause()
    if (scrub === null) setScrub(start) // 即時狀態按播放＝從 24 小時前開始回放
    play()
  }
  return (
    <Panel className={s.bar}>
      <button className={s.play} onClick={toggle} aria-label={playing ? '暫停' : '播放'}>
        {playing ? <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="1" width="3" height="10" fill="currentColor" /><rect x="7" y="1" width="3" height="10" fill="currentColor" /></svg>
          : <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 1v10L11 6z" fill="currentColor" /></svg>}
      </button>
      <div className={s.mid}>
        <div className={s.labels}><span>24 小時前</span><span className={s.now}>{fmtTime(t)} TPE</span><span>現在</span></div>
        <input className={s.range} type="range" min={start} max={live} step={60_000} value={t}
          onChange={(e) => { pause(); const v = Number(e.target.value); setScrub(v >= live - 60_000 ? null : v) }} />
      </div>
      <button className={s.speed} onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>{speed} 分/秒</button>
      <button className={s.live} aria-pressed={scrub === null} onClick={() => { pause(); setScrub(null) }}>即時</button>
      <button className={s.play} aria-label="關閉回放" onClick={() => { pause(); setScrub(null); useStore.getState().setReplayOpen(false) }}>
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2 2 10" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
    </Panel>
  )
}
