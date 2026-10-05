# Foundry Cloud deployment

Foundry Cloud supports a Next.js web process and a self-hosted Node.js runtime.
Neon PostgreSQL is the application database. Paystack is an optional external
payment processor, enabled only when the operator configures credentials.
Email delivery, DNS checks, local AI, voice synthesis, and file storage use
configured local or private-network services.

## Canonical engine source

The canonical raw engine source is the repository-root `raw-engine/` directory.
The CLI and Docker build already use it. The Next.js alias now points to this
same source; the duplicate `platform/raw-engine/` tree was consolidated into
the root engine. Do not reintroduce a second copy.

## Local development

1. Install Node.js 20.9 or newer.
2. Copy `platform/.env.example` to `platform/.env.local`.
3. Set `DATABASE_URL` to a Neon PostgreSQL connection string and set a random
   `JWT_SECRET`.
   The `.env.example` file contains runtime-only settings; do not commit real
   credentials.
4. From `platform/`, install the dependencies and start Next.js:

   ```sh
   npm install --foreground-scripts
   npm run dev
   ```

5. Check `/status` and `/api/health`. A component is reported online only after
   a real database query, TCP connection, or filesystem permission check
   succeeds. The health response does not report unconfigured services as
   healthy.

The Prisma schema is at `platform/prisma/schema.prisma`; the initial,
idempotent workspace foundation is tracked under
`platform/prisma/migrations/`. Review migrations before production rollout and
do not use `prisma db push --accept-data-loss` against a live database.

## Production web build

In Vercel, use `platform` as the Root Directory and the Next.js preset. The
build command is:

```sh
npx prisma generate && next build
```

Set at least `DATABASE_URL`, a randomly generated `JWT_SECRET` of 32 or more
characters, and `SITE_URL` in the deployment environment. Run
`npx prisma migrate deploy --schema prisma/schema.prisma` as part of the
release process. Vercel hosts the web process only. It does not provide a
durable local filesystem, unrestricted outbound SMTP port 25, or long-running
queue, build, DNS, and FFmpeg workers. Those services must run on a
self-hosted Node machine for the corresponding modules to be operational.

## Self-hosted requirements

- A Linux host with Docker Engine and the Compose plugin. For a first VPS,
  Hetzner Cloud is a practical price/performance starting point; check the
  provider's current SMTP restrictions and request port 25 access before
  provisioning. It is not guaranteed to be available for every account or
  region.
- A Neon database, with network access from the web process.
- A public domain whose A/AAAA records point to the host; inbound TCP 80/443
  must be allowed for Caddy certificate issuance.
- A persistent writable directory configured with `FOUNDRY_STORAGE_DIR`.
- A local SMTP server configured with `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM`,
  and, when required by the local server, `SMTP_USER` and `SMTP_PASS`. These
  values are optional at web startup; email is reported unavailable until
  configured and the SMTP socket check passes.
- For on-host text generation, an Ollama-compatible service on a private
  address, with `LOCAL_LLM_URL` and `LOCAL_LLM_MODEL` set. The model endpoint
  is restricted to localhost, a private IP, or a single-label private service
  name. No hosted model provider fallback is used.
- `espeak-ng` on the web host or in its container for local WAV synthesis.
- A local FFmpeg installation for video rendering.

The repository Compose file currently runs the web application behind Caddy
with persistent file and certificate volumes. Its optional `local-ai` profile
starts Ollama. Configure an SMTP host separately; an MTA is not bundled.
Queue workers, build-runner isolation, authoritative DNS, and FFmpeg job
workers are not present in the Compose file. The workflow runner currently
supports real trigger/transform/condition/delay execution and persists
workspace-scoped audit summaries; it explicitly rejects unconfigured database
and action nodes.

To inspect Compose configuration without starting services, copy the
environment file to the repository root as `.env`, set all required values,
then run:

```sh
docker compose config --quiet
docker compose build web
```

`deploy.sh` loads the operator-owned root `.env` when present, validates
required deployment settings, then runs pull/build/migrate/up/health checks.
Run it from the Linux host after DNS and firewall rules are configured.

DNS health checks use the host's DNS resolver. Authoritative zone hosting,
registrar operations, automated DKIM provisioning, and production queue/build
workers require separately configured native services; the app does not claim
these are live merely because their screens exist.

## Email deliverability

Direct outbound email requires a host/provider that permits TCP port 25,
correct forward and reverse DNS, and the operator's own SPF, DKIM, and DMARC
records. Configure a stable HELO hostname and PTR record with the host's
network administrator. Mailbox providers may reject messages until sending
reputation and domain authentication are established. Do not use a personal
mailbox as a bulk-mail relay.

The authenticated Email workspace's **Server readiness** check performs live
port 25, PTR/forward-confirmed HELO, SPF, DKIM (using the supplied or
`DKIM_SELECTOR` selector), DMARC, and DNSBL checks. A DNSBL resolver error is
reported as unknown, not as a clean result. The selected domain must match the
domain in `EMAIL_FROM`. The displayed warm-up counter reports conservative send
attempts; it is shared in PostgreSQL across app instances and resets 24 hours
after the first attempt in that counter window. SMTP attempts that fail after
the cap reservation consume a slot as a safety measure.

## Payments and registrar adapters

Paystack is the explicitly enabled external payment exception. Configure
`PAYSTACK_SECRET_KEY` and `PAYSTACK_CURRENCY` before creating checkout orders.
The webhook endpoint verifies Paystack's HMAC signature and independently
verifies successful charges with Paystack before marking an order paid.
Refunds remain `REFUND_PENDING` until a signed provider confirmation arrives.

The native bank-transfer option requires all three
`BANK_TRANSFER_BANK_NAME`, `BANK_TRANSFER_ACCOUNT_NAME`, and
`BANK_TRANSFER_ACCOUNT_NUMBER` values. Uploads are stored on the configured
persistent local volume. A different workspace admin must review the submitted
proof and confirm receipt; uploading proof never marks an order paid.
Neither payment method grants product downloads or service access: fulfillment
must be explicitly implemented against verified `PAID` orders before selling
digital goods.

For self-hosted use, set a persistent `FOUNDRY_STORAGE_DIR`; bank-transfer
proof uploads are not suitable for Vercel's ephemeral filesystem. RDAP
availability lookup and registrar registration/renewal are not enabled.

## Font source policy

User-uploaded fonts must be sourced only from `/fonts-src` and must include
proof of the uploader's right to host and distribute them. The repository does
not include borrowed or placeholder font files. Keep the catalog empty until a
font upload, conversion, and licensing workflow is deployed and tested.

## Known deployment boundary

The current Compose and runtime setup is not a substitute for separately
implemented queue workers, build sandbox, authoritative DNS service, local
font conversion pipeline, or full payment fulfillment. Do not represent these
as available until their services, persistence, access controls, and health
checks are deployed and verified. `/status` is the source of truth for
configured runtime components.
