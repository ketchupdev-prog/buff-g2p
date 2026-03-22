#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/../../../buffr-connect/packages" && pwd)"

echo "Building @buffr/types and @buffr/sdk..."
(cd "$REPO_ROOT/buffr-types" && npm install && npm run build)
(cd "$REPO_ROOT/buffr-sdk" && npm install && npm run build)

echo "Installing example dependencies..."
cd "$ROOT"
npm install

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example — edit EXPO_PUBLIC_* values."
fi

echo "Done. Run: npx expo start"
