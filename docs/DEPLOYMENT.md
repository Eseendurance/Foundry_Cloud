# Foundry-Cloud deployment

Foundry-Cloud supports a Next.js web process and a self-hosted Node.js runtime.
Neon PostgreSQL is the only hosted service the application is designed to call.
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

The Prisma schema is at `platform/prisma/schema.prisma`. A migration history
must be created and reviewed before production schema rollout; do not use
`prisma db push --accept-data-loss` against a live database.

## Production web build

In Vercel, use `platform` as the Root Directory and the Next.js preset. The
build command is:

```sh
npx prisma generate && next build
```

Set at least `DATABASE_URL`, `JWT_SECRET`, and `SITE_URL` in the deployment
environment. Vercel hosts the web process only. It does not provide a durable
local filesystem, unrestricted outbound SMTP port 25, or long-running queue,
build, DNS, and FFmpeg workers. Those services must run on a self-hosted Node
machine for the corresponding modules to be operational.

## Self-hosted requirements

- A Linux host with Docker Engine and the Compose plugin.
- A Neon database, with network access from the web process.
- A public domain whose A/AAAA records point to the host; inbound TCP 80/443
  must be allowed for Caddy certificate issuance.
- A persistent writable directory configured with `FOUNDRY_STORAGE_DIR`.
- A local SMTP server configured with `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM`,
  and, when required by the local server, `SMTP_USER` and `SMTP_PASS`.
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
workers are not present in the Compose file yet.

To inspect Compose configuration without starting services, copy the
environment file to the repository root as `.env`, set all required values,
then run:

```sh
docker compose config --quiet
docker compose build web
```

`deploy.sh` runs pull/build/migrate/up/health checks and refuses to continue
until a reviewed migration file exists under `platform/prisma/migrations/`.
That guard is intentional: the current repository has no migration history,
so deployment must not silently pretend that the database was migrated.
After migrations are added and reviewed, run the script from a Linux host with
the required variables exported or loaded from the root `.env`.

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

## Payments and registrar adapters

Paystack and RDAP integrations are intentionally omitted to honor the
no-third-party-API requirement. No domain purchase or payment is represented
as complete by this configuration. A native bank-transfer flow must verify
the received transfer and require an authorized operator confirmation before
marking an order paid or granting access.

## Font source policy

User-uploaded fonts must be sourced only from `/fonts-src` and must include
proof of the uploader's right to host and distribute them. The repository does
not include borrowed or placeholder font files. Keep the catalog empty until a
font upload, conversion, and licensing workflow is deployed and tested.

## Known deployment boundary

The current Compose and runtime setup is not a substitute for separately
implemented queue workers, build sandbox, authoritative DNS service, local
font conversion pipeline, or payment administration. Do not expose these as
available until their services, persistence, access controls, and health checks
are deployed and verified. `/status` is the source of truth for configured
runtime components.
