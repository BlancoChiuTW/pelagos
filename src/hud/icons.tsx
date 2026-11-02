// 介面圖示（inline SVG，SF Symbols 風格的細線）
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
export const Icon = {
  map: <svg viewBox="0 0 24 24" width="22" height="22"><path {...P} d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5L9 4zM9 4v13M15 6.5v13" /></svg>,
  ship: <svg viewBox="0 0 24 24" width="22" height="22"><path {...P} d="M4 15h16l-2.5 4.5h-11L4 15zM7 15V9h10v6M12 9V4.5M9.5 6.5h5" /></svg>,
  route: <svg viewBox="0 0 24 24" width="22" height="22"><circle {...P} cx="6" cy="18" r="2" /><circle {...P} cx="18" cy="6" r="2" /><path {...P} d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6" /></svg>,
  buoy: <svg viewBox="0 0 24 24" width="22" height="22"><circle {...P} cx="12" cy="13" r="4" /><path {...P} d="M12 9V3.5M9.5 5.5h5M4 19c2 1.3 4 1.3 6 0s4-1.3 6 0 4 1.3 4 0" /></svg>,
  bell: <svg viewBox="0 0 24 24" width="22" height="22"><path {...P} d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 0 0 4 0" /></svg>,
  plug: <svg viewBox="0 0 24 24" width="22" height="22"><path {...P} d="M9 3v4M15 3v4M7 7h10v4a5 5 0 0 1-10 0V7zM12 16v5" /></svg>,
  layers: <svg viewBox="0 0 24 24" width="18" height="18"><path {...P} d="M12 4 3 8.5l9 4.5 9-4.5L12 4zM3 12.5 12 17l9-4.5M3 16.5 12 21l9-4.5" /></svg>,
  info: <svg viewBox="0 0 24 24" width="18" height="18"><circle {...P} cx="12" cy="12" r="8.5" /><path {...P} d="M12 11v5.5M12 7.8v.2" /></svg>,
  search: <svg viewBox="0 0 24 24" width="16" height="16"><circle {...P} cx="10.5" cy="10.5" r="6" /><path {...P} d="m15 15 5 5" /></svg>,
  replay: <svg viewBox="0 0 24 24" width="18" height="18"><path {...P} d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5M12 8v4l3 2" /></svg>,
  close: <svg viewBox="0 0 24 24" width="16" height="16"><path {...P} d="M6 6l12 12M18 6 6 18" /></svg>,
}
