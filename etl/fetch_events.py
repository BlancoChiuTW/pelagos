# /// script
# requires-python = ">=3.11"
# dependencies = ["requests"]
# ///
"""可疑活動：GFW Events API 的海上相遇／徘徊／AIS 中斷 → public/data/events.json

篩選（減少雜訊、聚焦合規）：
  相遇 encounters：只留運搬船／加油船與漁船（疑似海上轉載、海上補給；WCPFC 圍網船只能在港內轉載）。
                   漁船對漁船（多為雙拖網作業）排除；同一次相遇兩艘船各記一筆，依時間與位置去重
  徘徊 loitering：只留運搬船、徘徊 ≥ 8 小時（通常是在等轉載）
  AIS 中斷 gaps：GFW 此資料集本身已是「刻意關閉且 ≥ 12 小時」；再只留 ≥ 72 小時、最近 600 筆
只輸出事件位置、時間、船籍、船型與事件屬性，不輸出船名。
"""
import datetime as dt
import json
import os
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "events.json"
URL = "https://gateway.api.globalfishingwatch.org/v3/events"
POLYS = [[[110, -25], [180, -25], [180, 45], [110, 45], [110, -25]], [[-180, -25], [-140, -25], [-140, 45], [-180, 45], [-180, -25]]]
end = dt.date.today() - dt.timedelta(days=5)
start = end - dt.timedelta(days=30)


def load_dotenv(path: Path) -> None:
    if path.exists():
        for line in path.read_text().splitlines():
            k, sep, v = line.partition("=")
            if sep and not line.lstrip().startswith("#") and k.strip() not in os.environ:
                os.environ[k.strip()] = v.strip()


def fetch(token: str, dataset: str, extra: dict, pages: int) -> list[dict]:
    out = []
    for poly in POLYS:
        body = {"datasets": [dataset], "startDate": str(start), "endDate": str(end), "geometry": {"type": "Polygon", "coordinates": [poly]}, **extra}
        offset = 0
        for _ in range(pages):
            r = requests.post(URL, params={"limit": 1000, "offset": offset}, json=body, headers={"Authorization": f"Bearer {token}"}, timeout=300)
            r.raise_for_status()
            j = r.json()
            out += j.get("entries", [])
            offset = j.get("nextOffset")
            if not offset or offset >= j.get("total", 0):
                break
    return out


def base(e: dict, kind: str) -> dict:
    p, v = e.get("position") or {}, e.get("vessel") or {}
    t0, t1 = e.get("start"), e.get("end")
    return {"id": e.get("id"), "kind": kind, "lat": round(p.get("lat", 0), 3), "lon": round((p.get("lon", 0)) % 360, 3), "start": t0, "end": t1, "flag": v.get("flag") or "", "vesselType": v.get("type") or ""}


load_dotenv(ROOT / ".env")
token = os.environ.get("GFW_TOKEN", "").strip()
if not token:
    print("沒有 GFW_TOKEN，略過（保留既有 events.json）")
    sys.exit(0)
try:
    enc = fetch(token, "public-global-encounters-events:latest", {}, 3)
    loi = fetch(token, "public-global-loitering-events:latest", {"vesselTypes": ["CARRIER"]}, 3)
    gap = fetch(token, "public-global-gaps-events:latest", {}, 5)
except Exception as e:
    print("GFW events 失敗：", str(e)[:200], file=sys.stderr)
    sys.exit(1)

events = []
seen = set()
for e in enc:
    x = e.get("encounter") or {}
    kind = x.get("type") or ""
    if "carrier" not in kind and "bunker" not in kind:
        continue
    d = base(e, "encounter")
    key = (round(d["lat"], 1), round(d["lon"], 1), (d["start"] or "")[:13])
    if key in seen:
        continue
    seen.add(key)
    d.update(encounterType="transshipment" if "carrier" in kind else "bunkering", potentialRisk=bool(x.get("potentialRisk")),
             flags=sorted({d["flag"], (x.get("vessel") or {}).get("flag") or ""} - {""}))
    events.append(d)
for e in loi:
    x = e.get("loitering") or {}
    if (x.get("totalTimeHours") or 0) >= 8:
        d = base(e, "loitering")
        d.update(hours=round(x.get("totalTimeHours") or 0, 1))
        events.append(d)
gaps = []
for e in gap:
    x = e.get("gap") or {}
    if (x.get("durationHours") or 0) >= 72:
        d = base(e, "gap")
        d.update(hours=round(x.get("durationHours") or 0, 1))
        gaps.append(d)
events += sorted(gaps, key=lambda d: d["start"] or "", reverse=True)[:600]
events.sort(key=lambda d: d["start"] or "", reverse=True)
OUT.write_text(json.dumps({"mode": "live", "dateRange": [str(start), str(end)], "source": "Global Fishing Watch Events API（相遇、徘徊、AIS 中斷）", "events": events}, ensure_ascii=False, separators=(",", ":")))
c = {k: sum(1 for d in events if d["kind"] == k) for k in ("encounter", "loitering", "gap")}
print(f"events.json raw enc={len(enc)} loi={len(loi)} gap={len(gap)} → kept {c} {OUT.stat().st_size // 1024}KB")
