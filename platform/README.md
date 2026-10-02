# Groundwork

A developer platform being built in the open. This repo currently contains
the real, working parts of it:

- Marketing/landing page (`app/page.tsx`)
- A live early-access signup API (`app/api/waitlist/route.ts`)
- A no-login workspace shell (`app/dashboard/page.tsx`)
- A working AI app builder (`app/build/page.tsx` + `app/api/generate/route.ts`)
  — describe an app, Claude streams back a real, self-contained HTML app
  you can preview, copy, or download. Needs `ANTHROPIC_API_KEY`.
- Real accounts and a workspace database (`app/account/page.tsx`,
  `app/api/auth/*`, `app/api/projects/route.ts`) — email/password signup
  with hashed passwords, signed session cookies, and projects persisted
  per user in Postgres. Needs `DATABASE_URL` and `JWT_SECRET`.
- A working in-browser code editor (`app/ide/page.tsx`) — a real Monaco
  editor (the engine behind VS Code) with a live preview pane. It's a
  genuine multi-file editor, not a terminal: full npm/terminal execution
  needs a sandboxing service (WebContainers or a server-side sandbox like
  E2B), which isn't wired up. "Open in IDE" from the app builder hands
  off a generated app for further editing.
- Real transactional email (`app/email/page.tsx`,
  `app/api/email/send/route.ts`) — sends over any real SMTP account you
  connect. The same page's domain checker (`api/email/verify-domain`)
  runs live SPF/DMARC DNS lookups and needs no credentials at all.
- Real domain lookups (`app/domains/page.tsx`, `app/api/domains/*`) —
  live RDAP registry data (the modern WHOIS) and live DNS records, no API
  key required. Actually purchasing a domain needs a connected registrar
  account (e.g. Namecheap, Enom) and isn't wired up — that's a business
  relationship to set up, not just a key to paste in.
- Real AI voice (`app/voice/page.tsx`, `app/api/voice/*`) — on-demand
  text-to-speech via ElevenLabs. A lip-synced video avatar is the next
  increment; it needs a GPU rendering service (Replicate or Modal) that
  isn't connected yet.
- Real search (`app/search/page.tsx`, `app/api/search/route.ts`) — full-text
  and typo-tolerant search that runs entirely inside your existing
  Postgres database. No external search service, no extra API key, no
  extra bill. Uses core Postgres full-text search always, and adds
  `pg_trgm` fuzzy matching automatically if your database host allows
  enabling extensions (most managed hosts do).

Nothing here is a mock or a demo screen — the build log on the homepage
tracks what's genuinely live vs. still in progress, and updates as modules
(app builder, database, email, domains, IDE, AI avatar) are wired in.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy on Vercel

You have two options — pick one, not both.

### Getting the code to GitHub

Vercel deploys from a GitHub (or GitLab/Bitbucket) repo, so it needs to
be there first:

```bash
chmod +x scripts/push-to-github.sh
./scripts/push-to-github.sh
```

Initializes git if this isn't a repo yet, commits everything, creates
the GitHub repo for you if you have the `gh` CLI installed and logged
in — otherwise it asks you to paste the URL of an empty repo you create
at github.com/new — then pushes. Safe to re-run any time; it skips
whatever's already done and just commits + pushes what's changed.

### Option A: Vercel's own Git integration (simplest)

1. Push this repo to GitHub.
2. Import it at vercel.com/new. Vercel auto-detects Next.js; no build
   command changes needed.
3. In Project Settings → Environment Variables, add what each module
   needs (see `.env.example` for the full list and where to get each
   one): `ANTHROPIC_API_KEY` for the app builder, `DATABASE_URL` +
   `JWT_SECRET` for accounts (this also powers search — nothing extra
   needed there), `SMTP_*` + `EMAIL_FROM` for sending email, and
   `ELEVENLABS_API_KEY` for AI voice. Domain lookup needs nothing.
   Skip any of these and that one module fails with a clear error instead
   of the rest of the site breaking.
4. Every push to `main` deploys automatically from here on.

### Option B: `scripts/deploy.sh` (CLI, one command)

Does everything above from your terminal instead — installs the Vercel
CLI if needed, links the project, walks you through each environment
variable (Enter to skip any you don't have yet), runs a local lint +
build so you catch errors before Vercel does, then deploys:

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Re-run it any time; it skips steps that are already done (login, link,
env vars already set) and just redeploys.

### Continuous integration

`.github/workflows/ci.yml` runs lint + build on every push and pull
request to `main` — nothing merges without a clean build. This runs
regardless of which deploy option you pick above.

`.github/workflows/deploy.yml` is an **optional**, disabled-by-default
alternative to Option A for deploying from GitHub Actions instead of
Vercel's own Git integration — most people don't need it. It's disabled
(`if: false`) until you add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and
`VERCEL_PROJECT_ID` as repo secrets; the file explains exactly where to
get each one.

### `vercel.json`

Sets safe response headers (`X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, a restrictive `Permissions-Policy`). No framework
overrides — Vercel auto-detects Next.js on its own.

## Next steps

The waitlist API currently logs signups to the server console (visible in
Vercel's function logs). Point `app/api/waitlist/route.ts` at a real
database once you'd rather store them in Postgres too — the form and
route contract won't need to change.

## Also included

- **Rate limiting** on every route that calls a paid third-party API or
  handles login/signup (`app/api/generate`, `app/api/voice/synthesize`,
  `app/api/email/send`, `app/api/auth/login`, `app/api/auth/signup`) —
  in-memory, per-IP, tuned per route. Protects your API bills and blocks
  crude brute-force attempts. Swap for a Redis-backed limiter (e.g.
  Upstash) if you need it to hold across cold starts.
- **`/api/health`** — reports which modules are actually configured, live.
  Point uptime monitoring at it.
- **`/robots.txt`** and **`/sitemap.xml`** — generated for real from the
  app's actual routes. Set `SITE_URL` so they (and Open Graph tags) point
  at your real domain instead of a placeholder.
- A branded 404 page.

## Known upstream advisory

`npm audit` reports a moderate DOMPurify advisory pulled in transitively
by `monaco-editor` (used for sanitizing hover-tooltip markdown inside the
editor, not for any content this app renders directly). It's already on
monaco-editor's latest release; there's no newer version to move to yet.
