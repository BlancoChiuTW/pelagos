# PELAGOS 技術規格 v1

> 對應 PRD v2。PRD 講「做什麼」，這份講「怎麼做」。兩份衝突時以 PRD 的驗收標準為準，並在 HANDOFF「待 Blanco 決定」提出。
> 最後更新：2026-11-02（Claude）

## 1. 執行環境與版本

| 項目 | 版本／規格 | 備註 |
|---|---|---|
| Node | 22.x | 本機 v22.22.1 |
| 建置 | Vite 8 | `base: '/pelagos/'`（GitHub Pages 子路徑） |
| 語言 | TypeScript 7（tsgo），`strict: true` | 不准用 `any`，不得已用 `unknown` 再收斂 |
| UI | React 19 | 函式元件＋hooks |
| 底圖 | maplibre-gl 6.16 | |
| 圖層 | deck.gl 9.4（core／layers／aggregation-layers／geo-layers／mapbox） | |
| 狀態 | zustand 5 | |
| 測試 | vitest | 只測純函式（§11） |
| 資料管線 | Python 3.12＋uv（numpy、pillow、requests） | |
| 瀏覽器 | 桌機 Chrome／Edge 最新版，**需要 WebGL2** | 不支援時顯示說明頁，不白屏 |

> ⚠️ **未驗證**：deck.gl 9.4 的 `MapboxOverlay` 搭 maplibre-gl 6 能否正常運作，T01 第一件事就是做最小冒煙測試（畫一個 ScatterplotLayer）。不行的話改用 `new Deck()` 獨立畫布疊在 MapLibre 上，並由 MapLibre 的 `move` 事件同步 viewState。

## 2. 目錄與模組

```
src/
  main.tsx  App.tsx
  data/
    types.ts            所有領域型別（§4）
    DataSource.ts       介面＋StaticSource（§5）
    grid.ts             網格取樣（雙線性內插）、經度正規化
  map/
    MapView.tsx         建 MapLibre、掛 MapboxOverlay、插洋流 canvas
    layerStack.ts       依 store 組出 deck.gl layers 陣列（§6 圖層順序）
    camera.ts           預設視角、開場動畫、flyTo 輔助
  layers/               一個圖層一個檔案，各自 export `createXxxLayer(...)`
    sst.ts  anomaly.ts  hotspot.ts  fleet.ts  others.ts  buoys.ts  tripTrack.ts
    currents/           ParticleField.ts（純運算）＋ CurrentsCanvas.tsx（繪製）
  sim/
    rng.ts              固定種子亂數（mulberry32）
    seed.ts             產生 Vessel／Trip／Event／Position／Buoy
    landmask.ts         由 SST 網格判斷海陸
    alerts.ts           警示規則（純函式）
    others.worker.ts    周邊船隻模擬（§8）
  hud/                  一個面板一個元件＋同名 .module.css
    TopBar  KpiWall  LayerPanel  VesselCard  TripTimeline  AlertFeed
    Timeline  PerfHud  SourceBadge  Legend  TourCaption  OfflineBanner
  tour/script.ts        自動導覽劇本
  styles/tokens.css  styles/global.css
  store.ts
public/
  data/                 ETL 輸出（§3）
  sw.js                 Service Worker（§10）
etl/fetch_ocean.py
```

規則：單檔 < 300 行；`layers/` 不得 import `hud/`；`sim/` 與 `data/grid.ts` 不得 import React（純邏輯，可測試）。

## 3. 資料管線與檔案格式

### 3.1 範圍與網格
- 經度 **100°E → 210°E**（＝150°W），緯度 **20°S → 45°N**，解析度 **0.5°**
- 網格：寬 220 × 高 131 = 28,820 格；列由南到北、欄由西到東
- **經度一律用 0–360**。NOAA 兩個資料集都是 −180–180，ETL 要分兩段抓（100→179.75、−180→−150）再把第二段 +360 後接上

### 3.2 來源

| 變數 | 資料集（ERDDAP griddap） | 備註 |
|---|---|---|
| sst、anom | `ncdcOisst21Agg_LonPM180`，`[(last)][(0.0)]` | °C；anom 為與 1991–2020 平年差 |
| ugos、vgos | `nesdisSSH1day`，`[(last)]` | m/s；\|緯度\| < 3° 設 0，流速上限 2.5 m/s |

### 3.3 輸出（`public/data/`）

改為**二進位**，總量約 230 KB（JSON 版約 700 KB）：

| 檔案 | 格式 |
|---|---|
| `ocean.json` | 中繼資料：`{ width, height, lon0, lat0, dlon, dlat, bounds:[w,s,e,n], sst:{time,source,scale:0.01,nodata:-32768}, anom:{...}, u:{time,source,scale:0.001,nodata:-32768}, v:{...} }` |
| `sst.i16` `anom.i16` `u.i16` `v.i16` | Int16 little-endian，長度 width×height，`值 × scale` 還原；`nodata` 代表陸地 |
| `sst.png` `anom.png` | 預先上色的圖（北在上、陸地透明），給 BitmapLayer 直接用 |

`lon0`／`lat0` 是第一格中心。格 (r, c) 的中心＝(`lon0 + c·dlon`, `lat0 + r·dlat`)。

## 4. 領域型別（`src/data/types.ts`）

```ts
type Lon = number;   // 0–360
type Lat = number;
type Epoch = number; // 毫秒，UTC

type VesselType = 'purse_seiner' | 'reefer';
type VesselStatus = 'fishing' | 'transit' | 'drifting' | 'in_port' | 'signal_lost';

interface Vessel { id: string; name: string; type: VesselType; flag: string; fleet: string; }

interface Trip {
  id: string; vesselId: string; departedAt: Epoch; departPort: string;
  status: 'active' | 'returned';
  summary: { days: number; sets: number; catchTons: number; fuelPct: number; activeBuoys: number };
}

type EventType = 'depart' | 'set' | 'deploy_buoy' | 'transship' | 'port_call' | 'bunker' | 'signal_lost';
interface TripEvent {
  id: string; tripId: string; vesselId: string; at: Epoch; type: EventType;
  lon: Lon; lat: Lat; detail: { catchTons?: number; port?: string; counterpart?: string; note?: string };
}

interface Position { vesselId: string; at: Epoch; lon: Lon; lat: Lat; sog: number; cog: number }

interface Buoy { id: string; vesselId: string; tracks: Float32Array; biomass: Float32Array }
// tracks：每小時一筆 [lon,lat]，共 25 筆（過去 24h＋現在）；biomass：同長度，單位噸

interface OceanGrid {
  width: number; height: number; lon0: Lon; lat0: Lat; dlon: number; dlat: number;
  sst: Float32Array; anom: Float32Array; u: Float32Array; v: Float32Array; // 陸地 = NaN
  meta: Record<'sst' | 'anom' | 'u' | 'v', { time: string; source: string }>;
}

type AlertLevel = 'info' | 'warn' | 'alert';
interface Alert { id: string; level: AlertLevel; at: Epoch; vesselId?: string; lon?: Lon; lat?: Lat; title: string; body: string }
```

## 5. 資料介面（`src/data/DataSource.ts`）

```ts
interface FleetSnapshot { vessels: Vessel[]; trips: Trip[]; events: TripEvent[]; positions: Position[]; buoys: Buoy[] }

interface DataSource {
  loadOcean(): Promise<OceanGrid>;
  loadFleet(ocean: OceanGrid, now: Epoch): Promise<FleetSnapshot>;
}
```

- `StaticSource`：`loadOcean` 讀 §3.3 檔案；`loadFleet` 呼叫 `sim/seed.ts`
- 之後的 `ApiSource` 只要實作同一個介面（對應正式架構的 API），**畫面與圖層不得直接 fetch**
- 任一資料載入失敗：對應圖層停用、`SourceBadge` 顯示錯誤，其他照常（PRD 穩定性要求）

## 6. 地圖與圖層

### 6.1 地圖
- 底圖：`https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`，需顯示 CARTO／OSM 出處
- 預設視角：center `[155, 8]`、zoom 3.2、pitch 0；`renderWorldCopies: true`；maxBounds 不設
- deck.gl：`new MapboxOverlay({ interleaved: false })`，deck 有自己的畫布疊在地圖上

### 6.2 疊放順序（下 → 上）

| 層 | 實作 | 備註 |
|---|---|---|
| 底圖 | MapLibre | |
| 海溫／海溫異常 | deck `BitmapLayer`，image = `sst.png`／`anom.png`，bounds = ocean.bounds | 不透明度 0.75；二選一 |
| 海況熱區 | deck `BitmapLayer`，image 由 canvas 即時產生 | 加法混色 |
| **洋流粒子** | **獨立 `<canvas>`，插在 MapLibre 畫布與 deck 畫布之間** | 所以船和浮標永遠在粒子上面 |
| FAD 浮標 | 近：`ScatterplotLayer`；zoom < 5：`GridLayer`（GPU 聚合，cellSize 50 km，依魚量加總上色） | |
| 周邊船隻 | 近：`ScatterplotLayer`（2px、alpha 0.5、二進位屬性）；zoom < 4：`ScreenGridLayer`（cellSize 10px） | |
| 航次軌跡 | `PathLayer`（選中船）＋ `ScatterplotLayer`（事件點） | |
| 自家船隊 | `IconLayer`（SVG 轉 data URL、`mask: true`），`getAngle = -cog`，依狀態上色；`pickable` | 可點 → 選中 |
| HUD | React DOM，`position: absolute` | |

### 6.3 色彩
- 海溫：沿用 ETL 色階（10–31°C，深藍 → 青 → 黃 → 橘紅）
- 海溫異常：−3 → +3°C，藍 → 透明 → 紅
- 浮標魚量：0 → 60 噸，`--text-dim` → `--accent` → `--warn`
- 船狀態：fishing `--ok`、transit `--accent`、drifting `--text-dim`、in_port 白、signal_lost `--alert`

## 7. 洋流粒子（`layers/currents/`）

- 數量：`clamp(畫布面積 / 180, 2000, 8000)`
- 每顆粒子存 lon、lat、age；每幀以 `grid.ts` 雙線性內插取 u、v，位移 = `(u,v) × k`（k 讓 1 m/s ≈ 每幀 0.6 px 視覺速度，依 zoom 換算成經緯度）
- 壽命 60–100 幀隨機；過期、出界、落在陸地或流速 < 0.02 → 在可視範圍內重撒
- 拖尾：每幀先用 `globalCompositeOperation = 'destination-in'`、alpha 0.92 淡化舊畫面，再畫新線段；線寬 1px，顏色依流速 `--text-dim` → `--accent`
- 地圖 `movestart` 時清空並暫停，`moveend` 後重撒。`requestAnimationFrame` 驅動，分頁隱藏時停止
- `ParticleField.ts` 是純運算（給 grid、bounds → 更新位置），可單元測試；`CurrentsCanvas.tsx` 只負責投影和繪製

## 8. 模擬（`src/sim/`）

### 8.1 共通
- `rng.ts`：mulberry32，種子固定為 `20261103`，每次載入結果相同（展示可重現）
- `SIM_NOW` = 頁面載入時間取整到小時；所有模擬時間都相對於它
- 只在海上：`landmask.ts` 用 SST 網格的 nodata 判斷，產生位置時遇陸地就重抽

### 8.2 自家船隊與航次（`seed.ts`，主執行緒，量小）
- 圍網船 30 艘「藍潮 101–130」、運搬船 6 艘「藍潮運 1–6」，船籍 TW，fleet「藍潮漁業」
- 圍網船的作業區：熱帶海域 5°S–10°N、140°E–185°E，偏好 SST 28–30°C 的格子
- 每艘一個進行中航次，出港 20–90 天前（從高雄 120.27°E 22.6°N 或轉載港出發）
- 圍網船一天的節奏：白天搜魚（10–12 節）→ 下網（停 2–3 小時，產生 `set` 事件，漁獲 5–60 噸）→ 夜間漂流（0–1 節）
- 運搬船：在作業區與轉載港之間直航（12–14 節）；轉載港：Pohnpei（158.2, 6.97）、Majuro（171.38, 7.1）、Tarawa（173.0, 1.35）、Honiara（159.95, −9.43）
- 產出：過去 24 小時每小時一筆 Position、整個航次的 TripEvent、Trip.summary
- 刻意製造展示用狀況：2 艘 `signal_lost`（最後回報 > 2 小時前）、1 艘油料 < 20%、1 艘今天剛轉載

### 8.3 FAD 浮標
- 每艘圍網船 250–350 個（總計約 9,000），分布在該船作業區周圍 300 km
- 漂移：24 小時，每小時用洋流網格推一步（1 小時 × 流速），存成 `Buoy.tracks`
- 魚量：0–60 噸，SST 28–30°C 且靠近溫度鋒面的機率較高

### 8.4 周邊船隻（`others.worker.ts`）
- 數量 10,000／50,000／100,000（store 切換）；分布：60% 在熱帶作業區、40% 沿航線散布
- 每艘：起點、航向、航速（0–14 節）；位置 = 起點 + 速度 × (t − t0)，遇陸地掉頭
- 訊息協定：

```ts
// 主 → worker
type ToWorker =
  | { kind: 'init'; count: number; seed: number; landmask: Uint8Array; grid: GridMeta }
  | { kind: 'tick'; t: Epoch };
// worker → 主（positions 用 transfer，不複製）
type FromWorker = { kind: 'frame'; t: Epoch; count: number; positions: Float32Array /* [lon,lat]*count */ };
```

- 主執行緒每 500 ms 送一次 `tick`（回放時依播放速度）；收到 `frame` 後以二進位屬性餵給 deck：`data: { length: count, attributes: { getPosition: { value: positions, size: 2 } } }`

### 8.5 警示規則（`alerts.ts`，純函式）
| 規則 | 條件 | 等級 |
|---|---|---|
| 訊號中斷 | 最後 Position 距 now > 2 小時 | alert |
| 油料低 | fuelPct < 20 | warn |
| FAD 禁用期 | 距下一個 7/1 ≤ 240 天，顯示倒數 | info |
| 入漁天數 | 每艘模擬剩餘天數，< 15 天 | warn |
| 轉載完成 | 24 小時內有 transship 事件 | info |

## 9. 狀態（`src/store.ts`）

```ts
interface AppState {
  layers: Record<'sst'|'anomaly'|'currents'|'buoys'|'others'|'fleet'|'hotspot'|'track', boolean>;
  othersCount: 10000 | 50000 | 100000;
  selectedVesselId: string | null;
  time: { now: Epoch; cursor: Epoch; playing: boolean; speed: 1 | 10 | 60 };
  online: boolean;
  intro: 'pending' | 'playing' | 'done';
  tour: { active: boolean; step: number };
  // actions：toggleLayer, setOthersCount, selectVessel, setCursor, play, pause, setSpeed, setOnline, ...
}
```
元件一律用 selector 取值（`useStore(s => s.layers.sst)`），不准整包取。deck layers 由 `layerStack.ts` 在 store 變動時重組。

## 10. 離線與降級（F16）
- `public/sw.js`（手寫，不加套件），只在 production 註冊
  - App 外殼與 `data/*`：cache-first
  - 底圖圖磚與樣式：network-first，失敗回快取（看過的區域離線也能看）
- 連線狀態：`online`／`offline` 事件＋資料請求失敗計數；離線時頂部顯示「離線｜資料時間 HH:MM」
- 無 WebGL2：顯示說明頁（瀏覽器需求）

## 11. 測試與驗證

`npm run verify` = 資料檔存在檢查 → `tsc -b` → `vitest run` → `vite build`。

必須有單元測試的純函式：
- `grid.ts`：雙線性內插、陸地回傳 NaN、經度正規化（−150 → 210）
- `rng.ts`：同種子同序列
- `seed.ts`：所有船位與浮標都在海上、都在範圍內；船數與浮標數符合規格
- `alerts.ts`：每條規則的觸發與不觸發
- `ParticleField.ts`：粒子出界或過期後會被重撒

畫面與效能**無自動檢查**，靠目視。視覺任務完成時，在 HANDOFF 註明「畫面未目視確認」。

## 12. 效能預算

| 項目 | 預算 |
|---|---|
| 每幀主執行緒工作 | < 6 ms（粒子更新＋繪製 < 3 ms） |
| 周邊船 tick | worker 內 < 30 ms／10 萬艘 |
| deck layer 重建 | 只在 store 變動或收到 frame 時，不得每幀重建 |
| 首次可互動 | < 3 秒（本機 production build） |
| 資料檔 | < 300 KB（不含底圖） |

效能 HUD：FPS 用 `requestAnimationFrame` 間隔的 1 秒移動平均；繪製點數＝周邊船＋浮標＋自家船。

## 13. 時間與單位
- 內部一律 UTC 毫秒；畫面顯示**台北時間（UTC+8）**並加註「TPE」
- 航速用節（kn）、航向用度、流速 m/s、溫度 °C、漁獲噸
- 數字顯示用等寬字體；座標顯示格式 `8.42°N 171.30°W`（210 → 150°W）

## 14. 視覺實作
- token 在 `styles/tokens.css`（值見 PRD §8），元件樣式一律 CSS Modules 引用變數，不寫死色碼
- 字體：UI 用系統字（`"Inter", "PingFang TC", "Microsoft JhengHei", sans-serif`）；數字用 `@fontsource/jetbrains-mono`（打包進來，離線可用）
- 面板：`backdrop-filter: blur(10px)`、1px `--line` 邊框、四角 8px 角標（`::before`／`::after`）
- 動畫：數字變化 300 ms 補間；面板進場 200 ms 淡入位移；不做無意義的循環動畫（洋流除外）

## 15. 開場與導覽
- 開場（F11）：載入完成後從 center `[150, 15]` zoom 1.3 `flyTo` 到預設視角，2.5 秒；圖層依序淡入：海溫 0.6s → 洋流 1.2s → 浮標 1.8s → 船隊 2.4s
- 導覽（F17）：`tour/script.ts` 是步驟陣列 `{ camera, layers, select?, caption, ms }`，對應 PRD §10 腳本；任何使用者操作即中止導覽

## 16. 部署
- GitHub 公開 repo `pelagos`，`vite.config.ts` 設 `base: '/pelagos/'`
- `.github/workflows/deploy.yml`：push main → `npm ci` → `npm run verify` → `actions/upload-pages-artifact` → `actions/deploy-pages`
- **建 repo 與第一次 push 要 Blanco 同意**

## 17. 已知風險
| 風險 | 對策 |
|---|---|
| MapboxOverlay 與 maplibre 6 不相容 | §1 冒煙測試；備案用獨立 Deck |
| 換日線附近 deck 圖層斷裂 | 經度全用 0–360，不跨 ±180 切資料；T01 冒煙測試放一個 200°E 的點確認 |
| 10 萬點在內顯上掉幀 | 預設 1 萬；zoom < 4 改 ScreenGrid 聚合 |
| 粒子 canvas 與 deck 畫布順序 | 掛載後手動 `insertBefore` deck canvas；冒煙測試確認 |
