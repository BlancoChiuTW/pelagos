// Catmull-Rom 平滑：每小時一點的航跡 → 每段插 k 點的平滑曲線（時間戳同步內插）
export function smoothTrack(pts: [number, number][], ts: number[], k = 6): { path: [number, number][]; times: number[] } {
  const n = pts.length
  if (n < 3) return { path: pts, times: ts }
  const path: [number, number][] = []
  const times: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)]
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      path.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
      times.push(ts[i] + (ts[i + 1] - ts[i]) * t)
    }
  }
  path.push(pts[n - 1])
  times.push(ts[n - 1])
  return { path, times }
}
