# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "requests"]
# ///
"""周邊漁船活動：Global Fishing Watch 4Wings「AIS 表觀捕魚努力量」→ public/data/gfw_effort.json

兩種模式，輸出格式相同、走同一個解析器：
  live：有環境變數 GFW_TOKEN → 呼叫 GFW API（非商業用途授權）
  mock：沒有 token → 依真實海溫產生「GFW 回應格式」的模擬資料（標示 mock，數量參考公開統計）

API（依 GFW 官方 Python SDK gfw-api-python-client 原始碼確認的參數名）：
  POST https://gateway.api.globalfishingwatch.org/v3/4wings/report
       ?spatial-resolution=LOW&temporal-resolution=ENTIRE&group-by=GEARTYPE
       &datasets[0]=public-global-fishing-effort:latest&date-range=YYYY-MM-DD,YYYY-MM-DD&format=JSON
  Authorization: Bearer <token>；body {"geojson": <Polygon>}
  回應 {"entries":[{"public-global-fishing-effort:v3.0":[{"lat","lon","hours","geartype","vesselIDs",...}]}]}
  GFW 資料約延遲 4–5 天，所以取「今天往前 35 天到往前 5 天」這 30 天。

用法：uv run etl/fetch_gfw.py          （mock）
      GFW_TOKEN=xxx uv run etl/fetch_gfw.py  （live；token 不要寫進任何檔案）
"""
import datetime as dt
import json
import os
import sys
from pathlib import Path

import numpy as np
import requests

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"
RAW = ROOT / "etl" / "raw" / "gfw_report.json"
OUT = DATA / "gfw_effort.json"
URL = "https://gateway.api.globalfishingwatch.org/v3/4wings/report"
DATASET = "public-global-fishing-effort:latest"
# 西／中太平洋作業範圍（經度 −180–180；跨換日線以兩個多邊形表示）
REGION = {"type": "MultiPolygon", "coordinates": [
    [[[110, -25], [180, -25], [180, 45], [110, 45], [110, -25]]],
    [[[-180, -25], [-140, -25], [-140, 45], [-180, 45], [-180, -25]]],
]}
GEARS = ["tuna_purse_seines", "drifting_longlines", "squid_jigger", "pole_and_line", "trawlers", "other_purse_seines"]

today = dt.date.today()
start, end = today - dt.timedelta(days=35), today - dt.timedelta(days=5)


def fetch_live(token: str) -> dict:
    params = {"spatial-resolution": "LOW", "temporal-resolution": "ENTIRE", "group-by": "GEARTYPE",
              "datasets[0]": DATASET, "date-range": f"{start},{end}", "format": "JSON"}
    r = requests.post(URL, params=params, json={"geojson": REGION}, headers={"Authorization": f"Bearer {token}"}, timeout=300)
    r.raise_for_status()
    return r.json()


def fetch_mock() -> dict:
    """依真實海溫產生 GFW 回應格式的模擬資料。0.1° 網格太細，模擬以 0.5° 格心輸出（欄位與真實相同）。
    規模參考：WCPFC 區大型鮪圍網約 332 艘（ISSF 2025）；延繩釣分布最廣；魷釣集中西北太平洋。"""
    meta = json.load(open(DATA / "ocean.json"))
    sst = np.frombuffer((DATA / "sst.i16").read_bytes(), dtype="<i2").reshape(meta["height"], meta["width"]).astype(np.float32)
    sst = np.where(sst == meta["nodata"], np.nan, sst * meta["sst"]["scale"])
    rng = np.random.default_rng(20261103)
    rows = []
    for r in range(meta["height"]):
        lat = meta["lat0"] + r * meta["dlat"]
        if not -25 <= lat <= 45:
            continue
        for c in range(meta["width"]):
            lon = meta["lon0"] + c * meta["dlon"]
            if not 110 <= lon <= 220 or np.isnan(sst[r, c]):
                continue
            t = sst[r, c]
            w = {  # 每種漁具在這格出現的強度（0–1），只看海溫與緯度的粗略規則
                "tuna_purse_seines": max(0, 1 - abs(t - 29.3) / 1.6) * (abs(lat) < 12),
                "drifting_longlines": max(0, 1 - abs(t - 25) / 7) * 0.55,
                "squid_jigger": (34 < lat < 45 and 140 < lon < 170) * max(0, 1 - abs(t - 16) / 6),
                "pole_and_line": (25 < lat < 38 and 128 < lon < 160) * 0.35,
                "trawlers": (lon < 125 and lat > 15) * 0.6,
                "other_purse_seines": (lon < 130 and 0 < lat < 30) * 0.3,
            }
            for g, k in w.items():
                if k <= 0 or rng.random() > k * 0.55:
                    continue
                vessels = int(1 + rng.poisson(1.5 * k))
                hours = round(float(rng.gamma(2.0, 9.0 * k * vessels)), 1)
                if hours < 1:
                    continue
                lon180 = lon - 360 if lon > 180 else lon
                rows.append({"lat": round(lat, 2), "lon": round(lon180, 2), "hours": hours, "geartype": g, "vesselIDs": vessels, "date": f"{start}"})
    return {"metadata": {"mock": True, "note": "PELAGOS 模擬資料（GFW 4Wings 回應格式）"}, "entries": [{"public-global-fishing-effort:v3.0": rows}]}


BIN = 0.5  # 前端用的彙整格（GFW LOW＝0.1°，10 萬格 3.6 MB 太大）


def normalize(resp: dict, mode: str) -> dict:
    """GFW 回應 → 前端精簡格式（彙整到 0.5°）。live 與 mock 共用這一段（同一個解析器）"""
    acc: dict[tuple, list] = {}
    for entry in resp.get("entries", []):
        for dataset, items in entry.items():
            for it in items or []:
                g = it.get("geartype") or "fishing"
                if g not in GEARS:
                    GEARS.append(g)
                lon = float(it["lon"])
                lon = lon + 360 if lon < 0 else lon
                key = (int(lon // BIN), int(float(it["lat"]) // BIN), GEARS.index(g))
                a = acc.setdefault(key, [0.0, 0])
                a[0] += float(it.get("hours") or 0)
                a[1] += int(it.get("vesselIDs") or 0)  # 0.1° 格的船數相加＝船格次（同船跨格會重複計）
    cells = [[round((x + 0.5) * BIN, 2), round((y + 0.5) * BIN, 2), round(h, 1), gi, v] for (x, y, gi), (h, v) in acc.items() if h >= 0.5]
    return {
        "mode": mode, "dataset": DATASET, "dateRange": [str(start), str(end)], "resolution": "GFW LOW 0.1° → 彙整 0.5°" if mode == "live" else "0.5°（模擬）",
        "gears": GEARS, "columns": ["lon", "lat", "hours", "gear", "vessels"], "cells": cells,
        "source": "Global Fishing Watch 4Wings · AIS 表觀捕魚努力量" + ("" if mode == "live" else "（模擬，待 API token）"),
    }


token = os.environ.get("GFW_TOKEN", "").strip()
RAW.parent.mkdir(exist_ok=True)
if token:
    try:
        resp, mode = fetch_live(token), "live"
    except Exception as e:  # 連線失敗不覆蓋既有檔案（CI 也不會擋部署）
        print("GFW live 失敗：", e, file=sys.stderr)
        sys.exit(1)
else:
    resp, mode = fetch_mock(), "mock"
RAW.write_text(json.dumps(resp, ensure_ascii=False))
out = normalize(resp, mode)
OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
by = {g: 0 for g in out["gears"]}
for c in out["cells"]:
    by[out["gears"][c[3]]] += c[2]
print(f"gfw_effort.json mode={mode} cells={len(out['cells'])} {OUT.stat().st_size // 1024}KB", {k: round(v) for k, v in by.items() if v})
