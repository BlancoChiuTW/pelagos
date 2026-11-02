import { useEffect, useState } from 'react'

/** 每 ms 毫秒回傳一次現在時間（模擬時鐘；回放功能 F12 會改成讀 store.time.cursor） */
export function useTicker(ms: number): number {
  const [t, setT] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return t
}
