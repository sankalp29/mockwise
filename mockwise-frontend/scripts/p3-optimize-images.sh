#!/usr/bin/env bash
# P3-04: resize step icons + logo for display sizes. Run from repo root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STEPS_SRC="public/coding-interview-steps-logos"
STEPS_OUT="public/coding-interview-steps-logos/optimized"
mkdir -p "$STEPS_OUT"

optimize_step() {
  local name="$1"
  local src="$STEPS_SRC/${name}.png"
  local tmp="$STEPS_OUT/${name}-tmp.png"
  local jpg="$STEPS_OUT/${name}.jpg"
  local webp="$STEPS_OUT/${name}.webp"

  if [[ ! -f "$src" ]]; then
    echo "Missing $src" >&2
    exit 1
  fi

  # Max edge 280px for ~140 CSS px @2x; JPEG keeps raster fallback ≤40KB
  sips -Z 280 "$src" --out "$tmp" >/dev/null
  sips -s format jpeg -s formatOptions 70 "$tmp" --out "$jpg" >/dev/null
  rm -f "$tmp"

  if command -v cwebp >/dev/null 2>&1; then
    cwebp -q 80 "$jpg" -o "$webp" >/dev/null 2>&1 || true
  fi

  ls -la "$jpg" ${webp:+"$webp"} 2>/dev/null || ls -la "$jpg"
}

optimize_step "pick-your-playground"
optimize_step "code-submit-get-schooled"
optimize_step "level-up"

# Header logo: 128px max edge, target ≤15KB
LOGO_SRC="public/mockwise.png"
if [[ -f "$LOGO_SRC" ]]; then
  sips -Z 128 "$LOGO_SRC" --out "public/mockwise-logo-128.png" >/dev/null
  if command -v cwebp >/dev/null 2>&1; then
    cwebp -q 80 "public/mockwise-logo-128.png" -o "public/mockwise-logo-128.webp" >/dev/null 2>&1 || true
  fi
  ls -la public/mockwise-logo-128.png public/mockwise-logo-128.webp 2>/dev/null || true
fi

echo "--- size check (targets: steps ≤40KB, logo ≤15KB) ---"
find public/coding-interview-steps-logos/optimized public/mockwise-logo-128.* -type f 2>/dev/null | while read -r f; do
  bytes=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f")
  echo "$bytes	$f"
done
