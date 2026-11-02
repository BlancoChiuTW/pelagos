// 預設視角與開場起點（TECH_SPEC §6.1、§18.4）
export const DEFAULT_VIEW = { center: [155, 8] as [number, number], zoom: 3.2, pitch: 0, bearing: 0 }
export const INTRO_START = { center: [150, 15] as [number, number], zoom: 1.3, pitch: 0, bearing: 0 }
export const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

/** 依螢幕給預設視角：手機底部有抽屜（約 45% 高），用 padding 讓船隊落在上半部 */
export function homeView() {
  if (typeof window !== 'undefined' && window.innerWidth <= 640) {
    return { ...DEFAULT_VIEW, center: [160, 4] as [number, number], zoom: 2.5, padding: { top: 70, bottom: Math.round(window.innerHeight * 0.45), left: 0, right: 0 } }
  }
  return { ...DEFAULT_VIEW, padding: { top: 0, bottom: 0, left: 0, right: 0 } }
}
