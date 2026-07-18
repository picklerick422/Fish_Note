#!/usr/bin/env bash
# 构建 Web 应用并同步产物到鸿蒙壳 rawfile（用 bash 执行，本目录禁止 chmod）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/app"
DEST="$ROOT/harmony/entry/src/main/resources/rawfile/webapp"

cd "$APP_DIR"
npm run build

rm -rf "$DEST"
mkdir -p "$DEST"
cp -r "$APP_DIR/dist/." "$DEST/"

echo "已同步 $(find "$DEST" -type f | wc -l) 个文件 -> $DEST"
