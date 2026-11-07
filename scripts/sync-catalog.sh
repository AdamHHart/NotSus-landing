#!/usr/bin/env bash
# scripts/sync-catalog.sh
#
# Refreshes data/catalog.json, data/search-synonyms.json and data/home-picks.json
# from the app repository, which owns all three.
#
# The catalogue lives in api-server/prisma/seedApps.js over there, because that
# is what fills the database the browser reads. This site builds its tiles from
# the same list, and a hand-kept second copy would drift within a month.
#
# Run this, then `npm run build:home`, whenever a site is added, removed or
# re-described in the app.
#
# Usage: bash scripts/sync-catalog.sh [path-to-app-repo]

set -euo pipefail

APP_REPO="${1:-$HOME/Development/NotSusClean}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -d "$APP_REPO" ]; then
  echo "Cannot find the app repository at $APP_REPO" >&2
  echo "Pass its path as the first argument." >&2
  exit 1
fi

echo "Regenerating the catalogue in $APP_REPO"
( cd "$APP_REPO" && node scripts/export-catalog.js )

cp "$APP_REPO/docs/catalog/featured.json" "$HERE/data/catalog.json"
cp "$APP_REPO/docs/catalog/search-synonyms.json" "$HERE/data/search-synonyms.json"
cp "$APP_REPO/docs/catalog/home-picks.json" "$HERE/data/home-picks.json"

echo "Copied into data/. Now run: npm run build:home"
