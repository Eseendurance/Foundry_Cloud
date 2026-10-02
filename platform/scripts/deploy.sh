#!/usr/bin/env bash
# Deploys this project to Vercel from the command line.
#
# What this does, in order:
#   1. Checks you have the Vercel CLI (installs it if not).
#   2. Logs you in if you aren't already.
#   3. Links this folder to a Vercel project (first run only).
#   4. Walks you through setting each real environment variable —
#      skip any you don't have yet; that module just won't work until
#      you add it later with `vercel env add`.
#   5. Runs a production build locally first, so you catch errors here
#      instead of in Vercel's build logs.
#   6. Deploys to production.
#
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh

set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Deploy =="

# 1. Vercel CLI
if ! command -v vercel &> /dev/null; then
  echo "Vercel CLI not found — installing it globally..."
  npm install -g vercel
fi

# 2. Auth
if ! vercel whoami &> /dev/null; then
  echo "Not logged in to Vercel yet."
  vercel login
fi

# 3. Link project (no-op if already linked — .vercel/ exists)
if [ ! -d ".vercel" ]; then
  echo "Linking this folder to a Vercel project..."
  vercel link
fi

# 4. Environment variables
echo ""
echo "Setting environment variables for production."
echo "Press Enter on any prompt to skip one — that module just stays"
echo "off until you add it later."
echo ""

set_env_var() {
  local key="$1"
  local hint="$2"
  if vercel env ls production 2>/dev/null | grep -qw "$key"; then
    echo "  $key already set — skipping."
    return
  fi
  read -rp "  $key ($hint) — paste value, or Enter to skip: " value
  if [ -n "$value" ]; then
    vercel env add "$key" production --value "$value" --yes
  fi
}

echo "-- AI provider (need at least ONE of these three) --"
set_env_var "ANTHROPIC_API_KEY" "app builder / IDE agent — console.anthropic.com"
set_env_var "GEMINI_API_KEY" "app builder fallback — aistudio.google.com/apikey, free tier"
set_env_var "GEMINI_MODEL" "optional, defaults to gemini-2.5-flash"
set_env_var "DEEPSEEK_API_KEY" "app builder fallback — platform.deepseek.com"
set_env_var "DEEPSEEK_MODEL" "optional, defaults to deepseek-v4-flash"

echo "-- Accounts, database, search --"
set_env_var "DATABASE_URL" "Postgres connection string — Neon, Supabase, Vercel Postgres, or Railway"
set_env_var "JWT_SECRET" "random string, e.g. output of: openssl rand -base64 32"

echo "-- Email (SPF/DMARC checker needs none of this) --"
set_env_var "SMTP_HOST" "email module"
set_env_var "SMTP_PORT" "email module, usually 587"
set_env_var "SMTP_USER" "email module"
set_env_var "SMTP_PASS" "email module"
set_env_var "EMAIL_FROM" "email module, e.g. \"Your Product <you@yourdomain.com>\""

echo "-- AI voice --"
set_env_var "ELEVENLABS_API_KEY" "AI voice module — elevenlabs.io"

echo "-- GitHub integration --"
set_env_var "GITHUB_CLIENT_ID" "GitHub OAuth App — github.com/settings/developers"
set_env_var "GITHUB_CLIENT_SECRET" "same OAuth App as above"

echo "-- Site --"
set_env_var "SITE_URL" "your real deployed URL, e.g. https://your-app.vercel.app"

# 5. Build locally first — fail fast, before it hits Vercel
echo ""
echo "Building locally to catch errors before deploying..."
npm install
npm run lint
npm run build
rm -rf .next

# 6. Deploy
echo ""
echo "Deploying to production..."
vercel --prod

echo ""
echo "Done. If you skipped any env vars above, add them any time with:"
echo "  vercel env add VAR_NAME production"
echo "then redeploy with:"
echo "  vercel --prod"
