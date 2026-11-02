#!/usr/bin/env bash
# 重新建置並在背景開 preview（port 4173），給 shot.mjs 截圖用
set -e
cd "$(dirname "$0")/.."
for p in $(pgrep -f "vite preview --port 4173"); do kill "$p" 2>/dev/null || true; done
npx vite build --logLevel error
setsid npx vite preview --port 4173 >/tmp/pelagos-preview.log 2>&1 < /dev/null &
for _ in $(seq 20); do curl -s -o /dev/null http://localhost:4173/pelagos/ && break; sleep 0.5; done
echo "preview ready: http://localhost:4173/pelagos/"
