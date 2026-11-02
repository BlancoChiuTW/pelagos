// 數字跳動（X07）：motion 補間直接寫進 DOM，不觸發 React 重繪
import { useEffect, useRef } from 'react'
import { animate } from 'motion'

export function AnimatedNumber({ value, digits = 0, from }: { value: number; digits?: number; from?: number }) {
  const el = useRef<HTMLSpanElement>(null)
  const prev = useRef(from ?? 0)
  useEffect(() => {
    const node = el.current
    if (!node) return
    const ctl = animate(prev.current, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => (node.textContent = v.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })),
    })
    prev.current = value
    return () => ctl.stop()
  }, [value, digits])
  return <span ref={el} className="num" />
}
