# HANDOFF — PELAGOS 接力交接

> 給接手的 AI（Claude Code／Codex 輪流）。**開工先讀完這份，再看 TASKS.md**。
> 最後更新：2026-11-02（Codex）｜規格以 PRD §15 v3、TECH_SPEC §19／§19.5 為準；功能進度見 TASKS.md

## 這是什麼

PELAGOS：遠洋船隊戰情儀表板（面試展示用 demo）。規格在 `docs/PRD.md`（做什麼），技術規格在 `docs/TECH_SPEC.md`（怎麼做）。
公司與船名全部虛構（藍潮漁業）。**不得在任何檔案或畫面寫入真實公司名稱。**
展示期限：2026-11-03 12:00 最終部署；10:00 起凍結功能、只修錯。

## 現況

- **已部署（2026-11-02 22:15）**：https://blancochiutw.github.io/pelagos/ （repo：https://github.com/BlancoChiuTW/pelagos，公開）。push main 自動部署；每日 06:00 排程更新 NOAA，有 `GFW_TOKEN` secret 才更新 GFW。**GitHub Secret `GFW_TOKEN` 尚未設定**（自動化權限擋下寫入 secret，需 Blanco 自己設）

- **最新 V04（bb19122，Codex）**：Blanco 授權閱讀專案與 Obsidian 脈絡後，基於現有版本直接改進美觀、簡潔度及互動。延續六模組與資料模型，沒有將需求假設視為已確認的業務工作流。先看 TECH_SPEC §19.6。
- V04 視覺：深藍／青綠 token、品牌側欄、六頁共用頂欄、重整 KPI 與船隊清單、管理表格及詳情面板；海溫透明度 0.30，管理頁隱藏但不卸載地圖。1250px 以下側欄收成圖示，950px 以下管理頁上下排列；桌面驗收，未宣稱完成手機版。
- V04 互動：Ctrl／⌘ K 搜尋、上下鍵與 Enter 選船、空結果提示、Escape／外點關閉選單；地圖詳情直達航次／主檔並共用選船；新增縮放／總覽復位；航次補登按需展開，錯誤與成功回饋、防重複點擊；表格排序、航次事件與資料來源卡可鍵盤操作。熱區未實作，開關改標「規劃中」並停用。
- V04 驗證：`npm run verify` 通過（26 測試＋型別＋建置），`git diff --check` 通過；`node scripts/ux-check.mjs` 的 10 組瀏覽器回歸通過，無 JS 執行錯誤／HTTP 失敗回應。驗證搜尋、跨頁選船、補登、主檔保存與 reload、警示、圖層、回放。六頁及 1600／1280／1024 桌面截圖已目視確認；輸出 `/tmp/pelagos-ux/`，最終總覽 `/tmp/pelagos-final.png`。最後微調面板不透明與浮標篩選標籤後已重跑 verify。SwiftShader 不代表真機效能；仍有既有 >500 kB chunk 提醒。
- 回放速度（Claude，Blanco 要求）：改為可選「每秒快轉 10 分／30 分／1 小時」，預設 30 分（`store.Speed = 10 | 30 | 60`）；ux-check 10 項仍通過
- **GFW 周邊漁船活動（Claude，Blanco 選 A 案）**：`etl/fetch_gfw.py` 有 live／mock 兩模式，**mock 直接輸出成 GFW 4Wings 回應格式**、與 live 走同一個 `normalize()` → `public/data/gfw_effort.json`。參數名來自 GFW 官方 Python SDK 原始碼（`spatial-resolution`、`group-by=GEARTYPE`、`datasets[0]=public-global-fishing-effort:latest`、`date-range`、Bearer token、body `geojson`）。**live 已實測成功（2026-11-02）**：token 在專案根目錄 `.env`（權限 600、已 gitignore，範本 `.env.example`）；`uv run etl/fetch_gfw.py` 會自動讀。**不得讀出、印出或寫進 repo**；CI 用 GitHub Secret `GFW_TOKEN`。真實資料 0.1° 共 10.7 萬格，ETL 彙整成 0.5°（1.1 萬格、272 KB）；拖網時數遠大於鮪圍網，熱度改對數權重。已加 GFW 出處標示（地圖 attribution、資訊選單、資料串接頁）。前端：**`layers/gfwRaster.ts` 載入時一次畫成 0.5° 圖片交給 MapLibre**（原 deck HeatmapLayer 平移縮放會重算 → 卡頓，且以畫面最大值正規化，熱帶遠洋被沿岸拖網壓到看不見；已移除）。色階＝對數、第 35–99 百分位；預設篩選「遠洋漁業」（圍網、延繩釣、魷釣、竿釣），可切全部、資料串接頁 GFW 連線卡與說明面板、CI 排程有 `secrets.GFW_TOKEN` 才抓。原「周邊船隻 1 萬」壓力測試點移到展示模式（效能 HUD）
- **手機版（≤ 640px，iPhone 16 393×852 基準）**：側欄→底部分頁列（戰情／船舶／航次／警示，浮標與資料串接手機隱藏）；頂欄只留搜尋＋圖層＋資訊；拿掉標語、縮放鈕、提示、回放；右側面板→底部抽屜（max 48vh）；預設視角 `camera.homeView()` 用 padding 讓船隊在抽屜上方；選船鏡頭往上偏；船舶／航次表手機只留重點欄。`scripts/shot.mjs` 支援 `VIEWPORT=393x852`（觸控、DPR 2）
- 本機 preview 保留於 `http://localhost:4173/pelagos/`，供 Blanco 審閱新版本。尚未 push、建遠端 repo 或部署；後續先依 Blanco 的 UI 反饋迭代。

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
- X01 完成：`hud/BootSequence.tsx`（逐字打字、載入狀態綁真實 Promise 逐行打勾、按任意鍵略過）＋`fx/director.ts`（GSAP：黑幕淡出、flyTo 俯衝、`store.introStage` 0→5 依序點亮海溫／洋流／浮標／船隊／HUD）。地圖初始視角改成 INTRO_START。海岸線 minzoom 2.4（高空會看到裁切框）
- **M1 剩下**：X02 光柱、X03 拖尾、X04 脈衝、X05 光暈、X06 面板轉場（詳情卡滑入與時間軸 stagger 已做，剩警示流）、X08 特效等級，以及 T02 部署（等 Blanco）
- **v3 改版（PRD §15、TECH_SPEC §19）**：Blanco 要「一套有管理功能的系統」＋Apple 介面＋戰略遊戲地圖＋視覺減法
- V01–V03 完成：Apple token（`styles/tokens.css`，舊變數名保留為別名）、Inter＋Noto Sans TC 打包；左側導覽列（`hud/Sidebar`）、上方工具列（搜尋／圖層 iOS 開關／資訊）、右側情境面板（沒選船＝KPI 總覽、選船＝詳情卡）；`store.view` 切頁，管理頁暫為 `pages/Placeholder`。地圖：俯視剪影＋狀態環＋名牌（zoom ≥ 4.5）＋全船隊 24h TripsLayer 航跡＋滑過小卡。預設圖層只開船隊＋航跡＋淡化海溫（飽和度 −0.45、透明 0.38）。已刪 TopBar／Readout／Legend／SourceBadge（併入資訊選單）
- 航線：Catmull-Rom 平滑＋雙層光暈（`layers/fleet.ts`）；運搬船 `trip.plan` 預定航線虛線＋ETA（`@deck.gl/extensions` PathStyleExtension）
- 管理模組全部完成（`src/pages/`）：船舶（表格搜尋篩選排序＋主檔編輯）、航次（每日漁獲圖＋新增事件＋病程）、浮標（魚量前 60＋前往）、警示（`sim/alerts.ts` 規則＋已處理）、資料串接（連線卡＋CSV/GeoJSON 匯入＋欄位對應＋範例 `public/data/sample_vms.csv`）。使用者資料在 `data/overrides.ts`（IndexedDB，`mergeSnapshot` 合併新增事件）
- F12 時間軸（`hud/TimeBar.tsx`，`store.scrub`：null＝即時）
- **NOAA 不能從瀏覽器直接抓（沒開 CORS）**，所以「資料串接」改成 CI 每日排程跑 ETL（`.github/workflows/deploy.yml` 的 schedule，失敗不擋部署）
- 驗證：21 個單元測試；每頁都截圖看過
- **剩下**：T02 部署（等 Blanco 同意建公開 repo）、README 技術決策（F18）、展示腳本彩排；X 特效系列已降為 P2
- **全球版**（TECH_SPEC §19.5）：海溫／異常／洋流全球 0.5°、經度 360° 相接（`GridMeta.wrap`）；陸地 NE 50m 全球
- 資料串接三個介面完成（`pages/InterfaceConsole.tsx`＋`DataHub.tsx`）：點連線卡切換主控台；VMS（NAF 報文，持續接收）、浮標平台（A 廠 JSON／B 廠分號 CSV 交替，正規化）、電子漁獲日誌（FLUX XML，「接收一筆」→ 解析成功寫入下網事件）。約 1/10 訊息刻意損壞，展示驗證失敗。NOAA 卡片顯示 ETL 管線圖。已截圖確認 VMS 與電子漁獲日誌寫入
- 美化第二輪：海溫新色階（28–30°C 給藍綠光、> 30°C 才轉金／珊瑚，透明 0.55）、底圖重新上色（海 #0a1622、陸 #080b10、地名與國界壓暗，`layers/sst.ts` recolorBasemap）
- 戰情頁右側：KPI 總覽下加船隊小清單（`hud/FleetList.tsx`，篩選＋點選）
- 時間軸改為平時收起：工具列「回放」或詳情卡「回放這艘船過去 24 小時航跡」才展開（`store.replayOpen`）。理由：實務上回放是事後調查工具（訊號中斷、下網位置、越界爭議），不是常駐看板元素
- 修藍潮運 1：和在港的藍潮 106 同座標導致圖示與名牌重疊 → seedFleet 錯開泊位。**別用 CollisionFilterExtension**：試過，名牌會全部被濾掉
- F18 完成（a80d49b）：README 已取代 Vite 範本，包含本機執行、已實作流程、資料模型圖、現行與正式架構圖、技術決策與取捨、全球海況格式與 CI 更新限制、效能量測表與重現方法、開源參考。正式架構與真機效能未測項目均明確標示；簡化 FLUX 不宣稱標準相容。
- F18 驗證：2026-11-02 `npm run verify` 通過（6 個測試檔、26 個測試、型別檢查及建置）；`git diff --check` 通過。建置提醒 chunk >500 kB，未擴大範圍調整。此次僅改文件，未重跑畫面截圖或 Mermaid 渲染；真機 FPS 仍待量測。
- 下一步：部署（T02，仍等 Blanco 授權，未建 repo／push／部署）、展示腳本彩排與真機效能量測。其他未完成項目依 TASKS.md 與 Blanco 指定順序接續；本次僅處理指定 F18。

## 接力規則（兩邊都必須遵守）

背景：Claude 與 Codex 都是 Plus 方案，額度有限。由 Blanco 決定現在輪到誰；**同一時間只有一個 AI 在動手**。

1. **開工**：讀 HANDOFF.md → 讀 TASKS.md → 找第一個 `[ ]`，改成 `[~] 你的名字 HH:MM`。只讀這項會碰到的檔案。
2. **做完一項**：`npm run verify` 必須通過 → TASKS.md 改 `[x]` 並附 commit 短碼 → `git commit -m "[任務ID] 摘要"` → 更新本檔「現況」→ `./scripts/sync-vault.sh`（同步給 Blanco 的 Obsidian）。
3. **額度快用完／要停手**：不管做到哪，立刻 `git commit -m "[任務ID] WIP: 做到哪"`，並在本檔「現況」寫清楚：做到哪、下一步是什麼、哪裡有坑。**沒寫交接就停手，等於這段白做。**
4. **不擴大範圍**：PRD 沒寫的功能不做；覺得 PRD 有問題，寫在「待 Blanco 決定」。
5. **推送**：repo 已建、Blanco 已同意部署。push main 會直接上線，**明天 10:00 凍結後只推修錯**；推之前 `npm run verify` 必須綠。
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
