# /// script
# requires-python = ">=3.11"
# dependencies = ["shapely", "requests"]
# ///
"""Natural Earth 10m 陸地 → 裁到作業範圍、簡化、經度轉 0–360 → public/data/land.geojson
用途：蓋在 0.5° 海溫上面，讓海岸線銳利（海溫網格的海岸是方塊狀）。

用法：uv run etl/fetch_land.py
"""
import json
from pathlib import Path

import requests
from shapely import affinity
from shapely.geometry import box, mapping, shape
from shapely.ops import unary_union

URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson"
ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "etl" / "raw" / "ne_10m_land.geojson"
OUT = ROOT / "public" / "data" / "land.geojson"
S, N = -21.0, 46.0

RAW.parent.mkdir(exist_ok=True)
if not RAW.exists():
    RAW.write_bytes(requests.get(URL, timeout=300).content)
src = json.load(open(RAW))
geoms = [shape(f["geometry"]) for f in src["features"]]

parts = []
for clip, shift in ((box(99.0, S, 180.0, N), 0.0), (box(-180.0, S, -149.0, N), 360.0)):
    for g in geoms:
        if g.intersects(clip):
            c = g.intersection(clip)
            parts.append(affinity.translate(c, xoff=shift) if shift else c)
land = unary_union(parts).simplify(0.01, preserve_topology=True)

def rnd(o):
    return [rnd(x) for x in o] if isinstance(o, (list, tuple)) and o and isinstance(o[0], (list, tuple)) else [round(o[0], 3), round(o[1], 3)]

geom = mapping(land)
geom["coordinates"] = rnd(geom["coordinates"]) if geom["type"] == "Polygon" else [rnd(p) for p in geom["coordinates"]]
OUT.write_text(json.dumps({"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"source": "Natural Earth 10m"}, "geometry": geom}]}, separators=(",", ":")))
print("land.geojson", OUT.stat().st_size // 1024, "KB", geom["type"], len(geom["coordinates"]))
