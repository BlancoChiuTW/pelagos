#!/usr/bin/env bash
# 把 repo 的規格與交接同步到 Obsidian vault（repo 為準）
set -euo pipefail
cd "$(dirname "$0")/.."
V="/mnt/c/Users/user/Documents/Obsidian/Vault/職涯/面試展示/PELAGOS"
[ -d "$V" ] || exit 0
put() { { printf -- '---\ntags: [PELAGOS, %s]\n---\n\n> repo：`%s`（以 repo 為準，這份是同步副本）\n\n' "$3" "$PWD/$1"; cat "$1"; } > "$V/$2"; }
put docs/PRD.md "PELAGOS PRD.md" PRD
put docs/TECH_SPEC.md "PELAGOS 技術規格.md" 技術規格
put HANDOFF.md "_README_交接.md" 交接
put TASKS.md "PELAGOS 待辦板.md" 待辦
echo "vault synced"
