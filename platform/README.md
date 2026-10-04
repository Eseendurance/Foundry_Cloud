# Foundry-Cloud

Foundry-Cloud is a Next.js workspace with a self-hostable raw engine. Neon
PostgreSQL is the only supported hosted service. Runtime model inference is
sent only to a configured private/local Ollama-compatible endpoint; speech is
generated locally by `espeak-ng`; email uses the configured SMTP server. No
hosted AI, voice, registrar, payment, or GitHub API integration is enabled.

## Run locally

Use Node.js 20.9 or newer. Configure the required values from `.env.example`
in `.env.local`, then:

```bash
npm install --foreground-scripts
npm run dev
```

The workspace requires `DATABASE_URL` (Neon PostgreSQL) and `JWT_SECRET` for
accounts and persisted workspace features. Configure `LOCAL_LLM_URL` and
`LOCAL_LLM_MODEL` to enable AI generation. Speech synthesis additionally
requires `espeak-ng` installed on the host.

Visit `/status` to see real checks for database connectivity, local engine
TCP, SMTP TCP, and writable persistent storage. Missing or failed services
are reported as offline; the app does not return mock success responses.

## Production build and Vercel

The Vercel Root Directory is `platform`. Build with:

```bash
npx prisma generate && next build
```

Vercel can host the web process, but it cannot provide durable local file
storage, a long-running worker, or unrestricted SMTP port 25. Run the engine
services on a self-hosted Node.js machine when those capabilities are needed.
See [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) for deployment limits and
operator prerequisites.

## Current implementation boundaries

- `/api/domains/dns` and `/api/email/verify-domain` perform live DNS lookups.
  They do not alter DNS records. RDAP and registrar purchases are disabled.
- `/api/email/send` sends through the configured SMTP server and requires an
  authenticated user. It does not claim success if SMTP is unavailable.
- `/api/generate`, `/api/copilot`, and the IDE agent require the configured
  local model server. They do not fall back to hosted AI services.
- `/api/voice/*` uses local `espeak-ng`; it does not call a hosted voice
  provider. Full lip-synced video rendering is not yet wired to a worker.
- API keys are stored as hashes in Neon and are shown only at issuance.
- Queue/build workers, authoritative DNS provisioning, full email warm-up and
  deliverability checks, font conversion and catalog management, and verified
  bank-transfer administration are not yet production-enabled. See the
  deployment document before enabling any of those modules.

This list is intentionally explicit: a UI or route is not described as
operational until it is connected to a real service and its health can be
verified.
