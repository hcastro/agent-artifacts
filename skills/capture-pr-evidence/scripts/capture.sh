#!/usr/bin/env bash
# Capture one Android screenshot to a local file.
# Usage: capture.sh <device-serial> <out.png>
# Frame the screen first (scroll/swipe) and wait out any debounced/async UI
# before calling this, or the shot shows a half-rendered state.
set -euo pipefail
DEVICE="${1:?device serial required (adb devices)}"
OUT="${2:?output path required, e.g. ./01-form.png}"
command -v adb >/dev/null || { echo "adb not found: install Android platform-tools" >&2; exit 1; }
state=$(adb -s "$DEVICE" get-state 2>/dev/null || true)
[ "$state" = device ] || { echo "device $DEVICE not ready (state: ${state:-missing}); check adb devices and unlock it" >&2; exit 1; }
tmp=$(mktemp "$OUT.XXXXXX"); trap 'rm -f "$tmp"' EXIT
adb -s "$DEVICE" exec-out screencap -p > "$tmp"
# 89504e47 is the PNG file signature; anything else is adb error text.
[ "$(head -c 4 "$tmp" | od -An -tx1 | tr -d ' \n')" = 89504e47 ] || { echo "screencap did not return a PNG" >&2; exit 1; }
mv "$tmp" "$OUT"; trap - EXIT
echo "saved $OUT ($(du -h "$OUT" | cut -f1))"
