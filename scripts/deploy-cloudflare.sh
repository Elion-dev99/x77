#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_DIR="$ROOT/apps/worker"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Error: CLOUDFLARE_API_TOKEN is required."
  echo "Create one at: https://dash.cloudflare.com/profile/api-tokens"
  echo "Permissions needed: Account / Cloudflare Workers Scripts Edit, D1 Edit"
  exit 1
fi

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "Error: CLOUDFLARE_ACCOUNT_ID is required."
  echo "Find it at: https://dash.cloudflare.com/ (right sidebar)"
  exit 1
fi

echo "==> Building frontend..."
npm run build -w apps/web

cd "$WORKER_DIR"

DB_ID=$(node -e "
  const fs = require('fs');
  const cfg = fs.readFileSync('wrangler.jsonc','utf8').replace(/\/\/.*$/gm,'');
  const m = cfg.match(/\"database_id\":\s*\"([^\"]+)\"/);
  console.log(m ? m[1] : '');
")

if [[ "$DB_ID" == "00000000-0000-0000-0000-000000000001" || "$DB_ID" == "REPLACE_WITH_YOUR_D1_ID" || -z "$DB_ID" ]]; then
  echo "==> Creating D1 database..."
  CREATE_OUT=$(npx wrangler d1 create livenova-db 2>&1) || true
  echo "$CREATE_OUT"
  NEW_ID=$(echo "$CREATE_OUT" | rg -o '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | tail -1)
  if [[ -n "$NEW_ID" ]]; then
    sed -i "s/00000000-0000-0000-0000-000000000001/$NEW_ID/; s/REPLACE_WITH_YOUR_D1_ID/$NEW_ID/" wrangler.jsonc
    echo "Updated database_id to $NEW_ID"
  fi
fi

echo "==> Applying D1 migrations..."
npx wrangler d1 migrations apply livenova-db --remote

echo "==> Deploying to Cloudflare Workers..."
npx wrangler deploy

echo ""
echo "Deployment complete! Your app URL:"
npx wrangler deployments list 2>/dev/null | head -5 || echo "https://livenova.<your-subdomain>.workers.dev"
