# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow", "requests"]
# ///
"""從 NOAA ERDDAP 抓西太平洋最新一天的海溫（OISST v2.1）與地轉流（NESDIS SSH ugos/vgos），
烘焙成前端直接吃的靜態檔：public/data/sst.json、sst.png、currents.json。

用法：uv run etl/fetch_ocean.py
"""
import json
import time
from pathlib import Path

import numpy as np
import requests
from PIL import Image

ERDDAP = "https://coastwatch.pfeg.noaa.gov/erddap/griddap"
LAT0, LAT1, LON0, LON1 = -15.0, 45.0, 100.0, 180.0
OUT = Path(__file__).resolve().parent.parent / "public" / "data"


RAW = Path(__file__).resolve().parent / "raw"


def griddap(dataset: str, query: str) -> dict:
    """抓 ERDDAP；原始回應快取在 etl/raw/（刪掉才會重抓），503 時退避重試。"""
    RAW.mkdir(exist_ok=True)
    cache = RAW / f"{dataset}.json"
    if cache.exists():
        return json.load(open(cache))["table"]
    url = f"{ERDDAP}/{dataset}.json?{query}"
    for attempt in range(5):
        r = requests.get(url, timeout=180)
        if r.status_code != 503:
            break
        time.sleep(10 * (attempt + 1))
    r.raise_for_status()
    cache.write_bytes(r.content)
    return r.json()["table"]


def to_grid(table: dict, var: str):
    cols = table["columnNames"]
    rows = table["rows"]
    ilat, ilon, iv, it = cols.index("latitude"), cols.index("longitude"), cols.index(var), cols.index("time")
    lats = sorted({r[ilat] for r in rows})
    lons = sorted({r[ilon] for r in rows})
    la = {v: i for i, v in enumerate(lats)}
    lo = {v: i for i, v in enumerate(lons)}
    g = np.full((len(lats), len(lons)), np.nan, dtype=np.float32)
    for r in rows:
        if r[iv] is not None:
            g[la[r[ilat]], lo[r[ilon]]] = r[iv]
    return np.array(lats), np.array(lons), g, rows[0][it]


# 0.5° 網格（stride 2 on 0.25°）。緯度由南到北。
box = f"[({LAT0}):2:({LAT1})][({LON0 + 0.125}):2:({LON1 - 0.125})]"
sst_t = griddap("ncdcOisst21Agg_LonPM180", f"sst[(last)][(0.0)]{box}")
lats, lons, sst, sst_time = to_grid(sst_t, "sst")
print("sst", sst.shape, sst_time, np.nanmin(sst), np.nanmax(sst))

uv_t = griddap("nesdisSSH1day", f"ugos[(last)]{box},vgos[(last)]{box}")
_, _, u, uv_time = to_grid(uv_t, "ugos")
_, _, v, _ = to_grid(uv_t, "vgos")
# 地轉流在赤道附近（科氏力→0）不成立，|lat|<3° 遮掉；其餘流速上限 2.5 m/s 去離群值
eq = np.abs(lats) < 3.0
u[eq, :] = np.nan
v[eq, :] = np.nan
spd = np.hypot(u, v)
scale = np.where(spd > 2.5, 2.5 / spd, 1.0)
u, v = u * scale, v * scale
print("uv", u.shape, uv_time, np.nanmax(np.hypot(u, v)))

OUT.mkdir(parents=True, exist_ok=True)
H, W = sst.shape
dlat = float(lats[1] - lats[0])
dlon = float(lons[1] - lons[0])
bounds = [float(lons[0] - dlon / 2), float(lats[0] - dlat / 2), float(lons[-1] + dlon / 2), float(lats[-1] + dlat / 2)]
meta = {"width": W, "height": H, "bounds": bounds, "lat0": float(lats[0]), "lon0": float(lons[0]), "dlat": dlat, "dlon": dlon}

# 海溫：整數 ×10，陸地 null（前端也用它當陸地遮罩）
sst_q = [[None if np.isnan(x) else int(round(float(x) * 10)) for x in row] for row in sst]
json.dump({**meta, "time": sst_time, "source": "NOAA OISST v2.1 (ERDDAP ncdcOisst21Agg)", "unit": "degC*10", "values": sst_q},
          open(OUT / "sst.json", "w"), separators=(",", ":"))

# 洋流：m/s，取 3 位小數；陸地/缺值補 0
def q(a):
    return [[0 if np.isnan(x) else round(float(x), 3) for x in row] for row in a]
json.dump({**meta, "time": uv_time, "source": "NOAA NESDIS SSH geostrophic currents (ERDDAP nesdisSSH1day)", "unit": "m/s", "u": q(u), "v": q(v)},
          open(OUT / "currents.json", "w"), separators=(",", ":"))

# 海溫色圖 PNG（北在上，所以翻轉列），透明陸地。色階：深藍→青→黃→橘紅，10–31°C
stops = np.array([[10, 8, 29, 88], [16, 37, 52, 148], [20, 34, 94, 168], [23, 29, 145, 192], [26, 65, 182, 196],
                  [28, 127, 205, 187], [29, 237, 248, 177], [30, 254, 196, 79], [31, 240, 59, 32]], dtype=np.float32)
rgba = np.zeros((H, W, 4), dtype=np.uint8)
t = np.clip(np.nan_to_num(sst, nan=stops[0, 0]), stops[0, 0], stops[-1, 0])
for c in range(3):
    rgba[..., c] = np.interp(t, stops[:, 0], stops[:, c + 1]).astype(np.uint8)
rgba[..., 3] = np.where(np.isnan(sst), 0, 255)
Image.fromarray(rgba[::-1]).save(OUT / "sst.png")
print("wrote", sorted(p.name for p in OUT.iterdir()))
