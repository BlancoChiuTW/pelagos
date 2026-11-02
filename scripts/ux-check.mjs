// V04 瀏覽器回歸：在獨立暫存 context 驗證操作，不修改使用者的瀏覽器資料。
// 先 npm run verify 並啟動 preview；node scripts/ux-check.mjs [url] [輸出目錄]
import assert from 'node:assert/strict'
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:4173/pelagos/'
const out = process.argv[3] ?? '/tmp/pelagos-ux'
mkdirSync(out, { recursive: true })
const cache = `${homedir()}/.cache/ms-playwright`
const version = readdirSync(cache).filter((x) => x.startsWith('chromium-')).sort().at(-1)
const browser = await chromium.launch({ executablePath: `${cache}/${version}/chrome-linux64/chrome`, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
page.setDefaultTimeout(20000)
const errors = [], network = [], checks = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('response', (r) => { if (r.status() >= 400) network.push(`${r.status()} ${r.url()}`) })
const nav = (name) => page.getByRole('navigation').getByRole('button', { name, exact: true })
const shot = async (name) => { await page.waitForTimeout(450); return page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled' }) }
const check = (label) => { checks.push(label); console.log(`OK ${label}`) }
try {
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(11000)
  await shot('01-map')
  const search = page.getByRole('combobox', { name: '搜尋船名或編號' })
  await page.keyboard.press('Control+k')
  assert.equal(await search.evaluate((el) => document.activeElement === el), true)
  await search.fill('不存在的船')
  await page.getByText('沒有符合的船舶', { exact: true }).waitFor()
  await search.fill('104')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: '查看航次', exact: true }).waitFor()
  await page.waitForTimeout(1300)
  await shot('02-selected')
  check('鍵盤搜尋、無結果提示與選船')

  await page.getByRole('button', { name: '查看航次', exact: true }).click()
  await page.getByRole('heading', { name: '航次紀錄' }).waitFor()
  assert.match(await page.locator('tr[aria-selected="true"]').innerText(), /104/)
  await shot('03-trips')
  check('地圖到航次保留同一艘船')
  await page.getByText('＋ 補登航次事件', { exact: true }).click()
  await page.getByLabel('緯度', { exact: true }).fill('100')
  await page.getByRole('button', { name: '新增事件', exact: true }).click()
  assert.match(await page.getByRole('alert').innerText(), /有效座標/)
  await page.getByLabel('緯度', { exact: true }).fill('5')
  await page.getByLabel('備註', { exact: true }).fill('V04 互動驗證')
  const before = Number((await page.locator('tr[aria-selected="true"] td').last().innerText()).trim())
  await page.getByRole('button', { name: '新增事件', exact: true }).click()
  await page.getByRole('status').filter({ hasText: '已新增' }).waitFor()
  const after = Number((await page.locator('tr[aria-selected="true"] td').last().innerText()).trim())
  assert.equal(after, before + 1)
  assert.equal(await page.getByRole('button', { name: '已加入航次', exact: true }).isDisabled(), true)
  check('補登事件：錯誤提示、寫入與防止重複點擊')

  await nav('船舶管理').click()
  assert.match(await page.locator('tr[aria-selected="true"]').innerText(), /104/)
  await page.getByLabel('船長', { exact: true }).fill('測試船長')
  await page.getByRole('button', { name: '儲存', exact: true }).click()
  await page.getByRole('status').filter({ hasText: '已儲存' }).waitFor()
  await page.getByLabel('篩選船舶表格').fill('無符合')
  await page.getByRole('button', { name: '清除篩選', exact: true }).click()
  assert.equal(await page.locator('tbody tr').count(), 36)
  await page.getByRole('button', { name: '油料', exact: true }).click()
  assert.equal(await page.getByRole('columnheader', { name: '油料' }).getAttribute('aria-sort'), 'ascending')
  await shot('04-vessels')
  check('主檔儲存、空結果復原、排序與跨頁選船')

  await nav('警示中心').click()
  const n = await page.getByRole('button', { name: '標記已處理', exact: true }).count()
  await page.getByRole('button', { name: '標記已處理', exact: true }).first().click()
  assert.equal(await page.getByRole('button', { name: '標記已處理', exact: true }).count(), n - 1)
  await page.getByRole('button', { name: '全部', exact: true }).click()
  await page.getByRole('button', { name: '取消處理', exact: true }).first().click()
  await shot('05-alerts')
  check('警示處理與取消處理')

  await nav('FAD 浮標').click()
  await page.getByRole('heading', { name: 'FAD 浮標' }).waitFor()
  await shot('06-buoys')
  await nav('資料串接').click()
  await page.getByRole('button', { name: 'NOAA 海況', exact: true }).focus()
  await page.keyboard.press('Enter')
  await page.getByText('NOAA 海況管線', { exact: true }).waitFor()
  await shot('07-data')
  check('六頁導覽與資料來源卡鍵盤操作')

  await nav('戰情總覽').click()
  await page.getByRole('button', { name: '返回船隊總覽', exact: true }).click()
  await page.getByRole('button', { name: '圖層', exact: true }).click()
  await page.getByRole('button', { name: '洋流', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: '洋流', exact: true }).getAttribute('aria-pressed'), 'true')
  await page.getByRole('button', { name: '洋流', exact: true }).click()
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('region', { name: '地圖圖層' }).count(), 0)
  await page.getByRole('button', { name: '回放', exact: true }).click()
  await page.getByRole('slider', { name: '回放時間' }).focus()
  await page.keyboard.press('ArrowLeft')
  await page.getByRole('button', { name: '關閉回放' }).click()
  check('圖層開關、Escape 關閉與時間軸鍵盤操作')

  for (const [w, h] of [[1280, 800], [1024, 768]]) {
    await page.setViewportSize({ width: w, height: h })
    await page.waitForTimeout(700)
    await shot(`08-map-${w}`)
    await nav('船舶管理').click()
    await shot(`09-vessels-${w}`)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await nav('戰情總覽').click()
  }
  check('1280 與 1024 桌面版面無頁面水平溢出')

  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(10000)
  await nav('船舶管理').click()
  await page.getByRole('button', { name: /編輯.*104/ }).click()
  assert.equal(await page.getByLabel('船長', { exact: true }).inputValue(), '測試船長')
  check('重新整理後主檔仍保留於 IndexedDB')
  assert.deepEqual(errors, [])
  check('無 JavaScript 執行錯誤')
  writeFileSync(`${out}/result.json`, JSON.stringify({ checks, errors, network }, null, 2))
  console.log(JSON.stringify({ checks: checks.length, errors, network, screenshots: out }))
} catch (e) {
  await shot('failure')
  console.error(e)
  console.error(JSON.stringify({ errors, network }))
  process.exitCode = 1
} finally { await browser.close() }
