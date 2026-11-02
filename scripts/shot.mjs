// 本機截圖：[MOUSE=x,y] [CLICK=x,y] node scripts/shot.mjs [url] [out.png] [waitMs]
// 用 Playwright 快取的 chromium（~/.cache/ms-playwright），開 WebGL（SwiftShader）
import { chromium } from 'playwright-core'
import { readdirSync } from 'node:fs'
import { homedir } from 'node:os'

const url = process.argv[2] ?? 'http://localhost:4173/pelagos/'
const out = process.argv[3] ?? '/tmp/pelagos-shot.png'
const wait = Number(process.argv[4] ?? 6000)
const dir = `${homedir()}/.cache/ms-playwright`
const ver = readdirSync(dir).filter((d) => d.startsWith('chromium-')).sort().at(-1)
const browser = await chromium.launch({
  executablePath: `${dir}/${ver}/chrome-linux64/chrome`,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
// VIEWPORT="393x852" 模擬 iPhone 16（觸控、DPR 2）
const [vw, vh] = (process.env.VIEWPORT ?? '1600x900').split('x').map(Number)
const mobile = vw <= 640
const page = await browser.newPage({ viewport: { width: vw, height: vh }, ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) })
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(wait)
// MOUSE="x,y" 讓滑鼠停在某點（測讀值、hover）；CLICK="x,y" 點一下
// WHEEL="x,y,dy" 在某點捲動滾輪（正值＝縮小）
if (process.env.WHEEL) {
  const [x, y, dy] = process.env.WHEEL.split(',').map(Number)
  await page.mouse.move(x, y)
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, dy / 6); await page.waitForTimeout(120) }
  await page.waitForTimeout(Number(process.env.AFTER ?? 1800))
}
for (const [env, act] of [['MOUSE', 'move'], ['CLICK', 'click']]) {
  if (!process.env[env]) continue
  for (const pt of process.env[env].split(';')) { // 多點用分號：CLICK="47,390;900,200"
    const [x, y] = pt.split(',').map(Number)
    await page.mouse.move(x, y)
    if (act === 'click') { if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y) }
    await page.waitForTimeout(Number(process.env.AFTER ?? 1800))
  }
}
await page.screenshot({ path: out })
const info = await page.evaluate(() =>
  [...document.querySelectorAll('canvas')].map((c) => `${c.className || '(no class)'} z=${getComputedStyle(c).zIndex} ${c.width}x${c.height} parent=${c.parentElement?.className}`),
)
console.log(info.join('\n'))
console.log(logs.filter((l) => !l.includes('[debug]')).slice(0, 20).join('\n'))
await browser.close()
