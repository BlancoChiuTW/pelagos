# /// script
# requires-python = ">=3.11"
# dependencies = ["requests"]
# ///
"""港口與停靠站：GFW Events API「進港事件」(public-global-port-visits-events) → 依錨地彙整 → public/data/ports.json

只輸出港口層級的統計（進港次數、船數、主要船籍國、停靠時數中位數），不輸出個別船名。
live：.env 或環境變數有 GFW_TOKEN；mock：沒有 token 時用已知轉載港產生同格式資料。

API（參數依 GFW 官方 Python SDK；2026-11-02 以小請求實測回應結構）：
  POST https://gateway.api.globalfishingwatch.org/v3/events?limit=…&offset=…
  body {datasets:[public-global-port-visits-events:latest], startDate, endDate, vesselTypes:[FISHING|CARRIER],
        confidences:["4"], geometry:<Polygon>}
  回應 entries[].port_visit.startAnchorage{name, flag, lat, lon, ...}、entries[].vessel{id, flag, type}、port_visit.durationHrs
"""
import datetime as dt
import json
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "ports.json"
URL = "https://gateway.api.globalfishingwatch.org/v3/events"
# 西／中太平洋（跨換日線拆兩塊）
POLYS = [[[110, -25], [180, -25], [180, 45], [110, 45], [110, -25]], [[-180, -25], [-140, -25], [-140, 45], [-180, 45], [-180, -25]]]
end = dt.date.today() - dt.timedelta(days=5)
start = end - dt.timedelta(days=90)


def load_dotenv(path: Path) -> None:
    if path.exists():
        for line in path.read_text().splitlines():
            k, sep, v = line.partition("=")
            if sep and not line.lstrip().startswith("#") and k.strip() not in os.environ:
                os.environ[k.strip()] = v.strip()


def fetch_live(token: str) -> list[dict]:
    out = []
    for poly in POLYS:
        for vt in ("FISHING", "CARRIER"):
            body = {"datasets": ["public-global-port-visits-events:latest"], "startDate": str(start), "endDate": str(end),
                    "vesselTypes": [vt], "confidences": ["4"], "geometry": {"type": "Polygon", "coordinates": [poly]}}
            offset = 0
            for _ in range(8):  # 每組最多 8 頁 × 1000 筆
                r = requests.post(URL, params={"limit": 1000, "offset": offset}, json=body, headers={"Authorization": f"Bearer {token}"}, timeout=300)
                r.raise_for_status()
                j = r.json()
                out += j.get("entries", [])
                offset = j.get("nextOffset")
                if not offset or offset >= j.get("total", 0):
                    break
    return out


def aggregate(events: list[dict]) -> list[dict]:
    ports: dict[tuple, dict] = {}
    vessels: dict[tuple, set] = defaultdict(set)
    flags: dict[tuple, Counter] = defaultdict(Counter)
    hours: dict[tuple, list] = defaultdict(list)
    for e in events:
        a = (e.get("port_visit") or {}).get("startAnchorage") or {}
        if a.get("lat") is None:
            continue
        name = (a.get("name") or "未命名錨地").title()
        key = (name, a.get("flag") or "")
        p = ports.setdefault(key, {"name": name, "country": a.get("flag") or "", "lat": a["lat"], "lon": a["lon"] % 360, "visits": 0, "fishing": 0, "carrier": 0})
        p["visits"] += 1
        v = e.get("vessel") or {}
        p["carrier" if v.get("type") == "carrier" else "fishing"] += 1
        vessels[key].add(v.get("id"))
        if v.get("flag"):
            flags[key][v["flag"]] += 1
        d = (e.get("port_visit") or {}).get("durationHrs")
        if d is not None:
            hours[key].append(float(d))
    out = []
    for k, p in ports.items():
        p["vessels"] = len(vessels[k])
        p["topFlags"] = flags[k].most_common(3)
        hs = sorted(hours[k])  # 中位數：長期停泊的船會把平均拉到數千小時
        p["medianHrs"] = round(hs[len(hs) // 2], 1) if hs else None
        p["lat"], p["lon"] = round(p["lat"], 3), round(p["lon"], 3)
        out.append(p)
    return sorted(out, key=lambda p: -p["visits"])


def mock() -> list[dict]:
    known = [("Pohnpei", "FSM", 6.97, 158.2, 40), ("Majuro", "MHL", 7.1, 171.38, 55), ("Tarawa", "KIR", 1.35, 173.0, 30),
             ("Honiara", "SLB", -9.43, 159.95, 25), ("Kaohsiung", "TWN", 22.6, 120.27, 80), ("Noro", "SLB", -8.23, 157.2, 15)]
    return [{"name": n, "country": c, "lat": la, "lon": lo % 360, "visits": v, "fishing": v - 5, "carrier": 5, "vessels": v // 2, "topFlags": [["TWN", v // 3]], "medianHrs": 48.0} for n, c, la, lo, v in known]


load_dotenv(ROOT / ".env")
token = os.environ.get("GFW_TOKEN", "").strip()
if token:
    try:
        ev = fetch_live(token)
    except Exception as e:
        print("GFW events 失敗：", str(e)[:200], file=sys.stderr)
        sys.exit(1)
    ports, mode = aggregate(ev), "live"
    print(f"events={len(ev)}", end=" ")
else:
    ports, mode = mock(), "mock"
OUT.write_text(json.dumps({"mode": mode, "dataset": "public-global-port-visits-events:latest", "dateRange": [str(start), str(end)],
                           "source": "Global Fishing Watch Events API · 進港事件（高信心度）" + ("" if mode == "live" else "（模擬）"), "ports": ports},
                          ensure_ascii=False, separators=(",", ":")))
print(f"ports.json mode={mode} ports={len(ports)} {OUT.stat().st_size // 1024}KB top:", [(p["name"], p["visits"]) for p in ports[:8]])
