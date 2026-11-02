# /// script
# requires-python = ">=3.11"
# dependencies = ["shapely", "requests"]
# ///
"""Natural Earth 50m 全球陸地 → 簡化 → public/data/land.geojson（經度 −180–180，MapLibre 會畫到每個世界副本）
用途：蓋在海溫上面，讓海岸線銳利（海溫網格的海岸是方塊狀）。

用法：uv run etl/fetch_land.py
"""
import json
from pathlib import Path

import requests
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson"
ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "etl" / "raw" / "ne_50m_land.geojson"
OUT = ROOT / "public" / "data" / "land.geojson"

RAW.parent.mkdir(exist_ok=True)
if not RAW.exists():
    RAW.write_bytes(requests.get(URL, timeout=300).content)
src = json.load(open(RAW))
land = unary_union([shape(f["geometry"]) for f in src["features"]]).simplify(0.01, preserve_topology=True)


def rnd(o):
    return [rnd(x) for x in o] if isinstance(o, (list, tuple)) and o and isinstance(o[0], (list, tuple)) else [round(o[0], 3), round(o[1], 3)]


geom = mapping(land)
geom["coordinates"] = rnd(geom["coordinates"]) if geom["type"] == "Polygon" else [rnd(p) for p in geom["coordinates"]]
OUT.write_text(json.dumps({"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"source": "Natural Earth 50m"}, "geometry": geom}]}, separators=(",", ":")))
print("land.geojson", OUT.stat().st_size // 1024, "KB")
