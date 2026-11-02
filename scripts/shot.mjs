// 本機截圖：node scripts/shot.mjs [url] [out.png] [waitMs]
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
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(wait)
await page.screenshot({ path: out })
const info = await page.evaluate(() =>
  [...document.querySelectorAll('canvas')].map((c) => `${c.className || '(no class)'} z=${getComputedStyle(c).zIndex} ${c.width}x${c.height} parent=${c.parentElement?.className}`),
)
console.log(info.join('\n'))
console.log(logs.filter((l) => !l.includes('[debug]')).slice(0, 20).join('\n'))
await browser.close()
