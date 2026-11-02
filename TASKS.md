# TASKS — PELAGOS 待辦板

> 規則見 HANDOFF.md「接力規則」。由上往下做；一次只認領一項。
> 狀態：`[ ]` 未開始｜`[~] 認領者 HH:MM` 進行中｜`[x]` 完成（附 commit 短碼）
> 每項的驗收標準在 docs/PRD.md 對應的 F 編號；實作方式照 docs/TECH_SPEC.md。

## M0 基礎（P0 前置）
- [ ] T00 ETL 改版（TECH_SPEC §3）：範圍 100°E→210°E、20°S→45°N，跨換日線分兩段抓再 +360 接上；加抓 anom；輸出改二進位 `ocean.json`＋`*.i16`＋`sst.png`／`anom.png`；刪舊的 sst.json／currents.json；`scripts/verify.sh` 的資料檔清單同步改
- [ ] T01 專案骨架（TECH_SPEC §1、§2、§5、§9）：裝 zustand、vitest、@fontsource/jetbrains-mono；建 types／DataSource／grid／store／tokens／MapView；**先做冒煙測試**（MapboxOverlay＋maplibre 6 能畫點、200°E 的點不斷裂、洋流 canvas 插在中間）；verify 加 `vitest run`；刪 Vite 範例
- [ ] T02 GitHub Pages 部署：`vite.config.ts` 設 base；`.github/workflows/deploy.yml`。**建立公開 repo 與 push 要等 Blanco 同意**

## M1 P0（目標 11/02 22:00）
- [ ] F01 HUD 版面與換日線連續
- [ ] F02 海溫圖層＋滑鼠讀值＋圖例
- [ ] F03 洋流粒子動畫
- [ ] S01 模擬資料：`src/sim/seed.ts` 照 PRD §4 產生 Vessel／Trip／Event／Position／Buoy（固定種子、只在海上）
- [ ] F04 船隊圖層（自家 36 艘＋周邊 Worker 模擬）
- [ ] F05 FAD 浮標圖層
- [ ] F06 船隻詳情卡
- [ ] F07 航次時間軸（病程）＋本航次軌跡
- [ ] F08 KPI 牆
- [ ] F09 效能 HUD＋數量切換（標「壓力測試」）
- [ ] F10 資料來源與時間標示
- [ ] F11 開場動畫

## M2 P1（目標 11/03 03:00）
- [ ] F12 時間軸回放
- [ ] F13 事件警示流
- [ ] F14 海況熱區（示意）
- [ ] F15 海溫異常圖層
- [ ] F16 離線與降級
- [ ] F17 自動導覽
- [ ] F18 README 技術決策（含資料模型圖、正式架構圖）

## M3 P2（有時間才做）
- [ ] F19 EEZ 界線
- [ ] F20 颱風
- [ ] F21 搜尋篩選
- [ ] F22 手機版
