#!/usr/bin/env bash
# Copies the PWA web files into the Android WebView assets directory.
# Run before every APK build: npm run apk:sync
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/android/app/src/main/assets/www"

rm -rf "$DEST"
mkdir -p "$DEST"

cp "$ROOT/index.html" "$ROOT/styles.css" "$ROOT/manifest.webmanifest" "$ROOT/sw.js" "$DEST/"
cp -R "$ROOT/js" "$DEST/js"
cp -R "$ROOT/assets" "$DEST/assets"

COUNT=$(find "$DEST" -type f | wc -l | tr -d ' ')
echo "Synced $COUNT files to android/app/src/main/assets/www"
