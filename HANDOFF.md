# HANDOFF — PELAGOS 接力交接

> 給接手的 AI（Claude Code／Codex 輪流）。**開工先讀完這份，再看 TASKS.md**。
> 最後更新：2026-11-02（Claude）｜PRD 已改為 v2（功能編號有變，以 TASKS.md 為準）

## 這是什麼

PELAGOS：遠洋船隊戰情儀表板（面試展示用 demo）。規格在 `docs/PRD.md`（做什麼），技術規格在 `docs/TECH_SPEC.md`（怎麼做）。
公司與船名全部虛構（藍潮漁業）。**不得在任何檔案或畫面寫入真實公司名稱。**
展示期限：2026-11-03 12:00 最終部署；10:00 起凍結功能、只修錯。

## 現況

- T01 完成：骨架（types／grid／DataSource／store／tokens／MapView）；冒煙測試已用無頭瀏覽器截圖確認——deck.gl 9.4＋MapLibre 6 可畫、120°E／180°／200°E 的點與海溫跨換日線連續、洋流 canvas 夾在 MapLibre 與 deck 畫布之間
- T00 完成：`public/data/` 已是 TECH_SPEC §3.3 的二進位格式，範圍 100°E–210°E（跨換日線無接縫，已目視 sst.png）。海溫／異常 2026-10-17，洋流 2026-09-28；網格 220×130、陸地 14%
- PRD v2：核心資料模型是「船 → 航次 → 事件」（PRD §4），模擬資料照它產生
- F01、F02 完成並截圖確認（海溫＋銳利海岸線、游標讀值、色階圖例、圖層開關面板；海溫／異常二選一）
- T02 工作流程已寫，**等 Blanco 同意建公開 repo `pelagos` 與 push**
- F03 完成：洋流粒子（Canvas 夾層、白色系 4 段流速、拖動暫停／放開重撒）。靜態截圖確認可見；**動態流動感未目視確認**（無頭瀏覽器跑 SwiftShader 很慢）
- S01 完成：`sim/seed.ts`＝船舶／航次／事件／24h 船位／浮標（約 9,000），`sim/status.ts` 由船位推導狀態。單元測試用真實網格驗證「全在海上」與展示狀況
- F04 完成：自家船 IconLayer（依狀態上色、依航向旋轉、可點選 → store.selectedVesselId）；周邊船 Web Worker（transfer Float32Array）＋二進位屬性點圖層。`map/layerStack.ts` 負責組 deck 圖層，`data/useFleet.ts` 依時間 t 算船姿態。**取捨**：拉遠改熱度格（ScreenGrid）疊在海溫上像棋盤，已改成 1px 淡點
- 已知視覺問題：灰色（漂流）箭頭在黃色海溫上對比弱 → X05 光暈加深色外暈
- F05 完成：浮標點圖層（依時間沿漂移軌跡內插；魚量色階灰→青→白、近看半徑隨魚量）。**配色原則**：資料圖層避開暖色，因為海溫底圖是橘黃。海溫透明度降到 0.6。聚合版（3D 光柱）由 X02 做
- F06＋F07 完成：點船 → 鏡頭移過去、詳情卡滑入（船況／所在海況／航次摘要／油料條）、航次時間軸（新到舊、點事件 → flyTo）、地圖畫整趟事件連線＋24h 航跡＋事件點。面板底色加深到 0.86（無頭瀏覽器裡 blur 不明顯，背景會透出）
- F08–F10 完成：KPI 牆（數字跳動＝X07 已含）、效能 HUD（FPS＋點數＋1/5/10 萬切換）、資料來源面板。狀態規則改為：圍網船當地 05–18 作業中、夜間漂流（面試時台北 14:00 ≈ 作業區當地 15–17 點，多數會顯示作業中）
- 注意：無頭瀏覽器 FPS 只有個位數（SwiftShader 軟體繪圖），不代表真機效能
- 下一步：X01 開機序列

## 接力規則（兩邊都必須遵守）

背景：Claude 與 Codex 都是 Plus 方案，額度有限。由 Blanco 決定現在輪到誰；**同一時間只有一個 AI 在動手**。

1. **開工**：讀 HANDOFF.md → 讀 TASKS.md → 找第一個 `[ ]`，改成 `[~] 你的名字 HH:MM`。只讀這項會碰到的檔案。
2. **做完一項**：`npm run verify` 必須通過 → TASKS.md 改 `[x]` 並附 commit 短碼 → `git commit -m "[任務ID] 摘要"` → 更新本檔「現況」→ `./scripts/sync-vault.sh`（同步給 Blanco 的 Obsidian）。
3. **額度快用完／要停手**：不管做到哪，立刻 `git commit -m "[任務ID] WIP: 做到哪"`，並在本檔「現況」寫清楚：做到哪、下一步是什麼、哪裡有坑。**沒寫交接就停手，等於這段白做。**
4. **不擴大範圍**：PRD 沒寫的功能不做；覺得 PRD 有問題，寫在「待 Blanco 決定」。
5. **不推送**：`git push`、建立 GitHub repo、部署，一律等 Blanco 說可以。
6. **省額度**：
   - 不要讀 `public/data/*.json`（很大），要知道格式看本檔「資料格式」
   - 不要讀 `node_modules/`、`package-lock.json`
   - 單檔 < 300 行，一個圖層一個檔案，改哪個讀哪個
   - 不要長時間開 dev server 或貼大段輸出

## 驗證

```
npm run verify     # tsc 型別檢查 + vite build + 資料檔存在檢查
npm run dev        # 本機看畫面（http://localhost:5173）
```
**截圖自我驗證**（不用麻煩 Blanco 當 QA）：
```
npm run build && (setsid npx vite preview --port 4173 >/tmp/pelagos-preview.log 2>&1 &)
node scripts/shot.mjs http://localhost:4173/pelagos/ /tmp/shot.png 9000   # 印出 canvas 疊放與 console 錯誤
```
用 Playwright 快取的 chromium（SwiftShader 軟體 WebGL），截圖後自己看圖。Codex 若沙盒不能開瀏覽器，就註明「畫面未目視確認」。

只有型別、單元測試與建置會被自動檢查。**畫面效果沒人自動看**：做完視覺類任務，在「現況」註明「畫面未目視確認」，讓 Blanco 或下一位確認。

## 目錄約定

```
etl/            Python 資料管線（uv run etl/fetch_ocean.py）
public/data/    烘焙好的靜態資料
src/data/       DataSource 介面與實作（之後換 API 只改這裡）
src/map/        MapLibre + deck.gl 外框
src/layers/     每個圖層一個檔案（回傳 deck.gl layer 或掛 canvas）
src/sim/        模擬：fleet.worker.ts、seed.ts（固定亂數種子）
src/hud/        每個面板一個元件
src/styles/     tokens.css（設計 token，見 PRD §7）
src/store.ts    Zustand 共用狀態
docs/PRD.md     規格
```

## 資料格式

以 `docs/TECH_SPEC.md` §3.3 為準：`ocean.json`（中繼資料）＋`sst/anom/u/v.i16`（Int16 LE，×scale 還原，−32768＝陸地）＋`sst.png`／`anom.png`（北在上、陸地透明）。

## 陷阱

- **MapLibre 6 的 worker**：它用 `import.meta.url` 找 worker，Vite 打包後會 404、地圖不出來。`MapView.tsx` 已用 `?url` 匯入並 `setWorkerUrl`，不要拿掉。
- **海岸線（已解決，別改回去）**：底圖的陸地是 background、海是 `water` 圖層，無法把海溫壓在陸地下。作法是海溫 PNG 整張外推填滿（不透明），再用 MapLibre 疊 `land.geojson`（Natural Earth 10m，`etl/fetch_land.py`）同色陸地＋淡青海岸線蓋上去。海溫與陸地都插在第一個 symbol 圖層前，地名在最上面。

- **換日線**：作業海域跨東經 180°。內部經度一律用 0–360（例如西經 150° = 210）；MapLibre 能吃超過 180 的經度，deck.gl 圖層也一樣。不要在 −180/180 處切資料。
- **赤道地轉流**：地轉流在赤道附近不成立，ETL 已把 |緯度| < 3° 設為 0，粒子在那裡會停住，這是正常的。
- **ERDDAP 偶爾 503 或暫時 404（Currently unknown datasetID）**：ETL 對兩者都會重試，並快取在 `etl/raw/`；要重抓就刪 `etl/raw/`。`ncdcOisst21Agg_LonPM180` 曾整個消失，所以改用 0–360 的 `ncdcOisst21Agg`。
- **NOAA 洋流資料比海溫舊**（9/28 vs 10/17）：畫面上分開標示資料時間，不要寫成同一天。

## 待 Blanco 決定

（目前無）
