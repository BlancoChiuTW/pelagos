# /// script
# requires-python = ">=3.11"
# dependencies = ["requests", "shapely"]
# ///
"""經濟海域（EEZ）：Marine Regions（Flanders Marine Institute，CC BY 4.0）WFS → public/data/eez.json
  boundaries：作業範圍內的 EEZ 邊界線（條約線、中線…）
  pna：PNA（瑙魯協定）會員國 EEZ 多邊形——入漁天數制度（VDS）適用的海域
經度一律轉成 0–360 連續（跨換日線的部分 +360），簡化 0.05°。
用法：uv run etl/fetch_eez.py
"""
import json
from pathlib import Path

import requests
from shapely import affinity
from shapely.geometry import MultiPolygon, Polygon, box, mapping, shape
from shapely.geometry.base import BaseGeometry

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "eez.json"
WFS = "https://geo.vliz.be/geoserver/MarineRegions/wfs"
BASE = {"service": "WFS", "version": "1.0.0", "request": "GetFeature", "outputFormat": "application/json"}
REGION = box(100, -30, 220, 50)  # 0–360 作業範圍；邊界線裁到這裡面
BBOXES = ["110,-25,180,45", "-180,-25,-140,45"]
# PNA 會員國＋托克勞（參與 VDS）
PNA = {"FSM": "密克羅尼西亞", "KIR": "吉里巴斯", "MHL": "馬紹爾群島", "NRU": "諾魯", "PLW": "帛琉", "PNG": "巴布亞紐幾內亞",
       "SLB": "索羅門群島", "TUV": "吐瓦魯", "TKL": "托克勞"}


def to360(g: BaseGeometry) -> BaseGeometry:
    """每個部件若在西經（質心 < 0）就整塊 +360，讓 WCPO 連續"""
    parts = list(getattr(g, "geoms", [g]))
    moved = [affinity.translate(p, xoff=360) if p.centroid.x < 0 else p for p in parts]
    return type(g)(moved) if hasattr(g, "geoms") else moved[0]


def rnd(o):
    if isinstance(o, (list, tuple)) and o and isinstance(o[0], (int, float)):
        return [round(o[0], 3), round(o[1], 3)]
    return [rnd(x) for x in o]


def feat(g: BaseGeometry, props: dict) -> dict:
    m = mapping(g)
    return {"type": "Feature", "properties": props, "geometry": {"type": m["type"], "coordinates": rnd(m["coordinates"])}}


lines, seen = [], set()
for bb in BBOXES:
    r = requests.get(WFS, params={**BASE, "typeName": "MarineRegions:eez_boundaries", "bbox": bb}, timeout=300)
    r.raise_for_status()
    for f in r.json()["features"]:
        lid = f["properties"].get("line_id")
        if lid in seen or not f.get("geometry"):
            continue
        seen.add(lid)
        g = to360(shape(f["geometry"])).intersection(REGION).simplify(0.1)
        if g.is_empty:
            continue
        p = f["properties"]
        lines.append(feat(g, {"name": p.get("line_name") or "", "type": p.get("line_type") or ""}))

pna = []
codes = ",".join(f"'{c}'" for c in PNA)
r = requests.get(WFS, params={**BASE, "typeName": "MarineRegions:eez", "CQL_FILTER": f"iso_ter1 IN ({codes})"}, timeout=300)
r.raise_for_status()
for f in r.json()["features"]:
    p = f["properties"]
    # 只留外框、去掉島嶼的洞（填色用不到海岸細節，檔案小一大截）
    raw = to360(shape(f["geometry"]))
    polys = [Polygon(p.exterior).simplify(0.08) for p in getattr(raw, "geoms", [raw]) if p.area > 0.05]
    if not polys:
        continue
    g = polys[0] if len(polys) == 1 else MultiPolygon(polys)
    c = max(polys, key=lambda p: p.area).representative_point()
    pna.append(feat(g, {"iso": p.get("iso_ter1"), "name": PNA.get(p.get("iso_ter1"), p.get("geoname")), "geoname": p.get("geoname"), "labelLon": round(c.x, 3), "labelLat": round(c.y, 3)}))

OUT.write_text(json.dumps({"source": "Marine Regions · Flanders Marine Institute (VLIZ), CC BY 4.0", "boundaries": {"type": "FeatureCollection", "features": lines},
                           "pna": {"type": "FeatureCollection", "features": pna}}, ensure_ascii=False, separators=(",", ":")))
print(f"eez.json lines={len(lines)} pna={len(pna)} {OUT.stat().st_size // 1024}KB", sorted({f['properties']['iso'] for f in pna}))
