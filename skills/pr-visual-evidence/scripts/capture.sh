#!/usr/bin/env bash
# Capture one Android screenshot to a local file.
# Usage: capture.sh <device-serial> <out.png>
# Frame the screen first (scroll/swipe) and wait out any debounced/async UI
# before calling this, or the shot shows a half-rendered state.
set -euo pipefail
DEVICE="${1:?device serial required (adb devices)}"
OUT="${2:?output path required, e.g. ./01-composer.png}"
adb -s "$DEVICE" exec-out screencap -p > "$OUT"
echo "saved $OUT ($(du -h "$OUT" | cut -f1))"
