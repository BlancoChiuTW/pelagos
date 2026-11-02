#!/usr/bin/env bash
# 接力用的單一驗證入口：型別、建置、資料檔。全部通過才算一項任務完成。
set -euo pipefail
cd "$(dirname "$0")/.."
for f in public/data/ports.json public/data/gfw_effort.json public/data/sample_vms.csv public/data/land.geojson public/data/ocean.json public/data/sst.i16 public/data/anom.i16 public/data/u.i16 public/data/v.i16 public/data/sst.png public/data/anom.png; do
  [ -s "$f" ] || { echo "缺資料檔：$f（跑 uv run etl/fetch_ocean.py）"; exit 1; }
done
npx tsc -b
npx vitest run --reporter=dot
npx vite build --logLevel warn
echo "verify OK"
