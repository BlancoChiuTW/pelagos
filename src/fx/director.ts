// 導演（TECH_SPEC §18.4）：GSAP 時間軸指揮開機序列。可跳過（progress(1)）。
import gsap from 'gsap'
import type * as maplibregl from 'maplibre-gl'
import { DEFAULT_VIEW } from '../map/camera'
import { useStore } from '../store'

/** 第二段：黑幕淡出 → 鏡頭俯衝 → 圖層依序點亮 → HUD 進場。回傳 timeline 供跳過 */
export function playReveal(map: maplibregl.Map, overlay: HTMLElement, onDone: () => void): gsap.core.Timeline {
  const setStage = useStore.getState().setIntroStage
  const tl = gsap.timeline({ onComplete: onDone })
  tl.to(overlay, { opacity: 0, duration: 0.5, ease: 'power1.out' }, 0)
  tl.call(() => map.flyTo({ ...DEFAULT_VIEW, duration: 2500, curve: 1.6, essential: true }), [], 0.1)
  tl.call(() => setStage(1), [], 0.4) // 海溫
  tl.call(() => setStage(2), [], 1.0) // 洋流
  tl.call(() => setStage(3), [], 1.6) // 浮標
  tl.call(() => setStage(4), [], 2.2) // 船隊
  tl.call(() => setStage(5), [], 2.6) // HUD
  tl.to({}, { duration: 0.4 }) // 收尾留白
  return tl
}

/** 跳過：直接到結尾狀態 */
export function skipToEnd(map: maplibregl.Map) {
  map.jumpTo(DEFAULT_VIEW)
  useStore.getState().setIntroStage(5)
}
