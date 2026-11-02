# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow", "requests"]
# ///
"""從 NOAA ERDDAP 抓西／中太平洋最新一天的海溫、海溫異常（OISST v2.1）與地轉流（NESDIS SSH），
烘焙成前端用的二進位網格（TECH_SPEC §3）：
  public/data/ocean.json、sst.i16、anom.i16、u.i16、v.i16、sst.png、anom.png

範圍全球（經度 0–360、78°S→80°N），0.5°。資料集經度是 −180–180，
OISST 用 0–360 版一段抓完；洋流資料集是 −180–180，跨換日線分兩段抓、第二段 +360 後接上。原始回應快取在 etl/raw/（刪掉才會重抓）。

用法：uv run etl/fetch_ocean.py
"""
import json
import time
from pathlib import Path

import numpy as np
import requests
from PIL import Image

ERDDAP = "https://coastwatch.pfeg.noaa.gov/erddap/griddap"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data"
RAW = ROOT / "etl" / "raw"
NODATA = -32768

# 0.25° 資料集取 stride 2 → 0.5°；格心 .125/.625
LAT = "(-77.875):2:(79.875)"  # 全球（海冰與高緯缺值以陸地處理）
# 經度 0–360 的資料集一段抓完；−180–180 的資料集跨換日線分兩段，第二段 +360
SEG_360 = [("all", "(0.125):2:(359.625)", 0.0)]
SEG_PM180 = [("east", "(0.125):2:(179.625)", 0.0), ("west", "(-179.875):2:(-0.375)", 360.0)]


def griddap(dataset: str, query: str, key: str) -> dict:
    RAW.mkdir(exist_ok=True)
    cache = RAW / f"{dataset}_{key}.json"
    if cache.exists():
        return json.load(open(cache))["table"]
    url = f"{ERDDAP}/{dataset}.json?{query}"
    for attempt in range(5):
        r = requests.get(url, timeout=240)
        # 503、或 404「Currently unknown datasetID」都是伺服器重載中的暫時狀態
        if r.status_code not in (503, 404):
            break
        time.sleep(10 * (attempt + 1))
    r.raise_for_status()
    cache.write_bytes(r.content)
    return r.json()["table"]


def fetch(dataset: str, varspec: list[str], prefix: str, names: list[str], segments):
    """回傳 lats, lons(0–360), {name: grid}, time；網格 [列=南→北][欄=西→東]"""
    lats_all, lons_all, parts, t = None, [], {n: [] for n in names}, None
    for key, lonq, shift in segments:
        q = ",".join(f"{v}{prefix}[{LAT}][{lonq}]" for v in varspec)
        tb = griddap(dataset, q, key)
        cols, rows = tb["columnNames"], tb["rows"]
        ilat, ilon, it = cols.index("latitude"), cols.index("longitude"), cols.index("time")
        lats = sorted({r[ilat] for r in rows})
        lons = sorted({r[ilon] for r in rows})
        la = {v: i for i, v in enumerate(lats)}
        lo = {v: i for i, v in enumerate(lons)}
        for n in names:
            iv = cols.index(n)
            g = np.full((len(lats), len(lons)), np.nan, dtype=np.float32)
            for r in rows:
                if r[iv] is not None:
                    g[la[r[ilat]], lo[r[ilon]]] = r[iv]
            parts[n].append(g)
        lats_all = np.array(lats)
        lons_all += [x + shift for x in lons]
        t = rows[0][it]
    return lats_all, np.array(lons_all), {n: np.concatenate(parts[n], axis=1) for n in names}, t


lats, lons, oi, sst_time = fetch("ncdcOisst21Agg", ["sst", "anom"], "[(last)][(0.0)]", ["sst", "anom"], SEG_360)
_, lons2, ss, uv_time = fetch("nesdisSSH1day", ["ugos", "vgos"], "[(last)]", ["ugos", "vgos"], SEG_PM180)
assert np.allclose(lons, lons2), "兩個資料集的經度格不一致"
assert np.allclose(np.diff(lons), 0.5), "經度不連續（換日線接縫錯）"
sst, anom, u, v = oi["sst"], oi["anom"], ss["ugos"], ss["vgos"]

# 地轉流在赤道附近（科氏力→0）不成立：|lat|<3° 遮掉；流速上限 2.5 m/s；陸地以海溫為準
eq = np.abs(lats) < 3.0
u[eq, :] = 0.0
v[eq, :] = 0.0
spd = np.hypot(u, v)
k = np.where(spd > 2.5, 2.5 / np.maximum(spd, 1e-9), 1.0)
u, v = u * k, v * k
land = np.isnan(sst)
for g in (u, v, anom):
    g[land] = np.nan

H, W = sst.shape
print(f"grid {W}x{H} lon {lons[0]}..{lons[-1]} lat {lats[0]}..{lats[-1]}")
print(f"sst {sst_time} {np.nanmin(sst):.1f}..{np.nanmax(sst):.1f}  anom {np.nanmin(anom):.1f}..{np.nanmax(anom):.1f}")
print(f"uv  {uv_time} max {np.nanmax(np.hypot(u, v)):.2f} m/s  land {land.mean():.1%}")

OUT.mkdir(parents=True, exist_ok=True)


def write_i16(name: str, g: np.ndarray, scale: float):
    q = np.where(np.isnan(g), NODATA, np.round(g / scale)).astype("<i2")
    (OUT / f"{name}.i16").write_bytes(q.tobytes())


src_oi = "NOAA OISST v2.1 (ERDDAP ncdcOisst21Agg)"
src_ss = "NOAA NESDIS SSH geostrophic currents (ERDDAP nesdisSSH1day)"
write_i16("sst", sst, 0.01)
write_i16("anom", anom, 0.01)
write_i16("u", u, 0.001)
write_i16("v", v, 0.001)

d = 0.5
meta = {
    "width": W, "height": H, "lon0": float(lons[0]), "lat0": float(lats[0]), "dlon": d, "dlat": d,
    "bounds": [float(lons[0] - d / 2), float(lats[0] - d / 2), float(lons[-1] + d / 2), float(lats[-1] + d / 2)],
    "wrap": True,  # 經度涵蓋 360°，取樣時左右相接
    "nodata": NODATA,
    "sst": {"time": sst_time, "source": src_oi, "scale": 0.01, "unit": "°C"},
    "anom": {"time": sst_time, "source": src_oi, "scale": 0.01, "unit": "°C"},
    "u": {"time": uv_time, "source": src_ss, "scale": 0.001, "unit": "m/s"},
    "v": {"time": uv_time, "source": src_ss, "scale": 0.001, "unit": "m/s"},
}
json.dump(meta, open(OUT / "ocean.json", "w"), ensure_ascii=False, indent=1)


UP = 2  # 色圖放大倍率（全球版用 2 倍，控制檔案大小）


def extrapolate(g: np.ndarray, iters: int = 4) -> np.ndarray:
    """把海上數值往陸地外推幾格（鄰格平均），放大內插時海岸不會被 NaN 吃掉"""
    out = g.copy()
    for _ in range(iters):
        nan = np.isnan(out)
        if not nan.any():
            break
        pad = np.pad(out, 1, constant_values=np.nan)
        nb = np.stack([pad[1:-1, :-2], pad[1:-1, 2:], pad[:-2, 1:-1], pad[2:, 1:-1]])
        with np.errstate(all="ignore"):
            mean = np.nanmean(nb, axis=0)
        out = np.where(nan & ~np.isnan(mean), mean, out)
    return out


def upsample(a: np.ndarray) -> np.ndarray:
    img = Image.fromarray(a.astype(np.float32), mode="F")
    return np.asarray(img.resize((a.shape[1] * UP, a.shape[0] * UP), Image.Resampling.BICUBIC))


def colorize(g: np.ndarray, stops: np.ndarray, alpha_from_stops: bool = False) -> Image.Image:
    # 整張外推填滿、不留透明：海岸由前端疊的 Natural Earth 陸地（land.geojson）蓋住，才銳利
    vals = upsample(np.nan_to_num(extrapolate(g, iters=40), nan=float(stops[0, 0])))
    h, w = vals.shape
    rgba = np.zeros((h, w, 4), dtype=np.float32)
    t = np.clip(vals, stops[0, 0], stops[-1, 0])
    for c in range(4 if alpha_from_stops else 3):
        rgba[..., c] = np.interp(t, stops[:, 0], stops[:, c + 1])
    if not alpha_from_stops:
        rgba[..., 3] = 255
    return Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8)[::-1])  # 北在上


# 色階（v3 配色）：作業海域多在 28–30°C，所以這段給沉穩的藍綠光；只有 > 30°C 才轉金、珊瑚，避免暖色鋪滿畫面
SST_STOPS = np.array([[-2, 6, 12, 26], [10, 10, 24, 46], [18, 12, 44, 72], [24, 14, 78, 104], [27, 18, 112, 128],
                      [28.5, 28, 138, 146], [29.5, 90, 150, 140], [30.3, 200, 150, 90], [31.5, 230, 110, 80]], dtype=np.float32)
ANOM_STOPS = np.array([[-3, 40, 110, 255, 230], [-1, 60, 160, 255, 140], [0, 255, 255, 255, 0],
                       [1, 255, 140, 70, 140], [3, 255, 60, 60, 230]], dtype=np.float32)
colorize(sst, SST_STOPS).save(OUT / "sst.png")
colorize(anom, ANOM_STOPS, alpha_from_stops=True).save(OUT / "anom.png")

for old in ("sst.json", "currents.json"):
    (OUT / old).unlink(missing_ok=True)
print("wrote", sorted(f"{p.name}:{p.stat().st_size // 1024}K" for p in OUT.iterdir()))
