# TASKS — PELAGOS 待辦板

> 規則見 HANDOFF.md「接力規則」。由上往下做；一次只認領一項。
> 狀態：`[ ]` 未開始｜`[~] 認領者 HH:MM` 進行中｜`[x]` 完成（附 commit 短碼）
> 每項的驗收標準在 docs/PRD.md 對應的 F 編號；實作方式照 docs/TECH_SPEC.md。

## M0 基礎（P0 前置）
- [x] T00 (b6262e9) ETL 改版（TECH_SPEC §3）：範圍 100°E→210°E、20°S→45°N，跨換日線分兩段抓再 +360 接上；加抓 anom；輸出改二進位 `ocean.json`＋`*.i16`＋`sst.png`／`anom.png`；刪舊的 sst.json／currents.json；`scripts/verify.sh` 的資料檔清單同步改
- [x] T01 (5af3e24) 專案骨架（TECH_SPEC §1、§2、§5、§9）：裝 zustand、vitest、@fontsource/jetbrains-mono、motion、gsap、@luma.gl/effects；建 types／DataSource／grid／store／tokens／MapView；**先做冒煙測試**（MapboxOverlay＋maplibre 6 能畫點、200°E 的點不斷裂、洋流 canvas 插在中間）；verify 加 `vitest run`；刪 Vite 範例
- [~] T02 (10fbc7c 工作流程已寫；等 Blanco 同意建公開 repo 與 push) GitHub Pages 部署：`vite.config.ts` 設 base；`.github/workflows/deploy.yml`。**建立公開 repo 與 push 要等 Blanco 同意**

## M1 P0（目標 11/02 22:00）
- [x] F01 (2151478) HUD 版面與換日線連續
- [x] F02 (1e319c9) 海溫圖層＋滑鼠讀值＋圖例
- [x] F03 (57cc82d) 洋流粒子動畫
- [x] S01 (eba3a6b) 模擬資料：`src/sim/seed.ts` 照 PRD §4 產生 Vessel／Trip／Event／Position／Buoy（固定種子、只在海上）
- [x] F04 (cbfd613) 船隊圖層（自家 36 艘＋周邊 Worker 模擬）
- [x] F05 (c016a18) FAD 浮標圖層
- [x] F06 (ae01ef6) 船隻詳情卡
- [x] F07 (ae01ef6) 航次時間軸（病程）＋本航次軌跡
- [x] F08 (653bf64) KPI 牆
- [x] F09 (653bf64) 效能 HUD＋數量切換（標「壓力測試」）
- [x] F10 (653bf64) 資料來源與時間標示
- [x] X01 (37d257e) 開機序列（含 F11 開場；TECH_SPEC §18.4）
- [ ] X02 3D 魚量光柱（v3 降為 P2）
- [ ] X03 船隻發光拖尾
- [ ] X04 警示脈衝環
- [ ] X05 霓虹光暈
- [ ] X06 面板轉場＋X07 數字跳動
- [ ] X08 特效等級與自動降級

## M1.5 v3 改版（PRD §15，優先於下方未完成項目）
- [x] V01 (7afec12) 視覺改版（Apple 字體／字級／材質，拿掉科幻角標）
- [x] V02 (7afec12) 戰略地圖表現（剪影、狀態環、名牌、全船隊航跡、預設圖層減法）
- [x] V03 (7afec12) 導覽列＋情境面板＋圖層選單＋資訊／展示模式
- [x] M01 (3138b37) 船舶管理（表格＋主檔編輯＋IndexedDB）
- [x] M02 (3138b37) 航次管理（病程＋每日漁獲圖＋手動新增事件）
- [x] M03 (36aeb0c) 資料串接（NOAA 即時、CSV／GeoJSON 匯入＋欄位對應）
- [x] M04 (3138b37) 警示中心
- [x] M05 (3138b37) 浮標清單

## M2 P1（目標 11/03 03:00）
- [x] F12 (199c78d) 時間軸回放
- [ ] F13 事件警示流
- [ ] F14 海況熱區（示意）
- [ ] F15 海溫異常圖層
- [ ] F16 離線與降級
- [ ] F17 自動導覽
- [x] F18 (a80d49b) README 技術決策（含資料模型圖、正式架構圖）
- [ ] X09 雷達掃描
- [ ] X10 畫面質感
- [ ] X11 鏡頭環繞

## M3 P2（有時間才做）
- [ ] F19 EEZ 界線
- [ ] F20 颱風
- [ ] F21 搜尋篩選
- [ ] F22 手機版
