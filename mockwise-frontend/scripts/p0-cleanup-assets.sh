#!/usr/bin/env bash
# P0-07 asset cleanup — run from repo root: bash scripts/p0-cleanup-assets.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

rm -rf public/company-logos/MockWise_files

cd public/company-logos
rm -f \
  airbnb.png amazon.png atlassian.png databricks.png doordash.png \
  google.png linkedin.png meta.png microsoft.png netflix.png slack.png spotify.png

echo "Removed MockWise_files and unused full-size company logos."
echo "Kept: resized/, public/mockwise.png, and referenced marketing assets."
