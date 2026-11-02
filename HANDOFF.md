# HANDOFF — PELAGOS 接力交接

> 給接手的 AI（Claude Code／Codex 輪流）。**開工先讀完這份，再看 TASKS.md**。
> 最後更新：2026-11-02（Claude）｜PRD 已改為 v2（功能編號有變，以 TASKS.md 為準）

## 這是什麼

PELAGOS：遠洋船隊戰情儀表板（面試展示用 demo）。規格在 `docs/PRD.md`（做什麼），技術規格在 `docs/TECH_SPEC.md`（怎麼做）。
公司與船名全部虛構（藍潮漁業）。**不得在任何檔案或畫面寫入真實公司名稱。**
展示期限：2026-11-03 12:00 最終部署；10:00 起凍結功能、只修錯。

## 現況

- 已有：Vite + React 19 + TS 骨架（仍是範例頁）、maplibre-gl 與 deck.gl 9 套件已裝
- T00 完成：`public/data/` 已是 TECH_SPEC §3.3 的二進位格式，範圍 100°E–210°E（跨換日線無接縫，已目視 sst.png）。海溫／異常 2026-10-17，洋流 2026-09-28；網格 220×130、陸地 14%
- PRD v2：核心資料模型是「船 → 航次 → 事件」（PRD §4），模擬資料照它產生
- 下一步：TASKS.md 的 T01（先做冒煙測試）

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
只有型別與建置會被自動檢查。**畫面效果沒人自動看**：做完視覺類任務，在「現況」註明「畫面未目視確認」，讓 Blanco 或下一位確認。

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

- **換日線**：作業海域跨東經 180°。內部經度一律用 0–360（例如西經 150° = 210）；MapLibre 能吃超過 180 的經度，deck.gl 圖層也一樣。不要在 −180/180 處切資料。
- **赤道地轉流**：地轉流在赤道附近不成立，ETL 已把 |緯度| < 3° 設為 0，粒子在那裡會停住，這是正常的。
- **ERDDAP 偶爾 503 或暫時 404（Currently unknown datasetID）**：ETL 對兩者都會重試，並快取在 `etl/raw/`；要重抓就刪 `etl/raw/`。`ncdcOisst21Agg_LonPM180` 曾整個消失，所以改用 0–360 的 `ncdcOisst21Agg`。
- **NOAA 洋流資料比海溫舊**（9/28 vs 10/17）：畫面上分開標示資料時間，不要寫成同一天。

## 待 Blanco 決定

（目前無）
