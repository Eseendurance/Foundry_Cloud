import { Pool, type PoolClient, type QueryResultRow } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;
let trigramEnabled = false;

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Hosted PostgreSQL endpoints may use certificates that are not
      // present in the host trust store. Local Postgres without TLS still
      // works if DATABASE_URL includes `?sslmode=disable`.
      ssl: process.env.DATABASE_URL?.includes("sslmode=disable")
        ? false
        : { rejectUnauthorized: false },
      max: 5,
      // Allow time for a suspended database compute to wake on first use.
      connectionTimeoutMillis: 15_000,
    });
  }
  return pool;
}

async function ensureSchema(): Promise<void> {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query(`
    DO $$ BEGIN
      CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      plan_tier "PlanTier" NOT NULL DEFAULT 'FREE',
      stripe_customer_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_tier "PlanTier" NOT NULL DEFAULT 'FREE';`);
  await db.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS organization_memberships (
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (organization_id, user_id)
    );
  `);
  await db.query(`
    INSERT INTO organizations (id, name)
    SELECT md5('foundry-workspace:' || u.id)::uuid,
           split_part(u.email, '@', 1) || '''s workspace'
    FROM users u
    WHERE NOT EXISTS (
      SELECT 1 FROM organization_memberships m WHERE m.user_id = u.id
    )
    ON CONFLICT (id) DO NOTHING;
  `);
  await db.query(`
    INSERT INTO organization_memberships (organization_id, user_id, role)
    SELECT md5('foundry-workspace:' || u.id)::uuid, u.id, 'owner'
    FROM users u
    WHERE NOT EXISTS (
      SELECT 1 FROM organization_memberships m WHERE m.user_id = u.id
    )
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;`);
  await db.query(`
    UPDATE projects p SET org_id = m.organization_id
    FROM organization_memberships m
    WHERE p.user_id = m.user_id AND p.org_id IS NULL
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS projects_org_created_idx ON projects (org_id, created_at DESC);`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sent_emails (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      link_url TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      opened_at TIMESTAMPTZ,
      click_count INTEGER NOT NULL DEFAULT 0
    );
  `);
  await db.query(`ALTER TABLE sent_emails ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;`);
  await db.query(`
    UPDATE sent_emails e SET org_id = m.organization_id
    FROM organization_memberships m
    WHERE e.user_id = m.user_id AND e.org_id IS NULL
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS sent_emails_org_sent_idx ON sent_emails (org_id, sent_at DESC);`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS github_connections (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      github_login TEXT NOT NULL,
      access_token_enc TEXT NOT NULL,
      connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL DEFAULT '',
      label TEXT,
      key_hash TEXT UNIQUE NOT NULL,
      key_preview TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      monthly_quota INTEGER NOT NULL DEFAULT 1000,
      current_usage INTEGER NOT NULL DEFAULT 0,
      usage_month DATE NOT NULL DEFAULT date_trunc('month', now())::date
    );
  `);
  await db.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix TEXT NOT NULL DEFAULT '';`);
  await db.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS label TEXT;`);
  await db.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';`);
  await db.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;`);
  await db.query(`
    UPDATE api_keys k SET org_id = m.organization_id
    FROM organization_memberships m
    WHERE k.user_id = m.user_id AND k.org_id IS NULL
  `);
  await db.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS monthly_quota INTEGER NOT NULL DEFAULT 1000;`);
  await db.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS current_usage INTEGER NOT NULL DEFAULT 0;`);
  await db.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS usage_month DATE NOT NULL DEFAULT date_trunc('month', now())::date;`);
  await db.query(`
    UPDATE api_keys SET label = COALESCE(label, name), key_prefix = COALESCE(NULLIF(key_prefix, ''), key_preview)
    WHERE label IS NULL OR key_prefix = ''
  `);
  await db.query(`ALTER TABLE api_keys ALTER COLUMN label SET NOT NULL;`);
  await db.query(`CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys (key_hash);`);
  await db.query(`CREATE INDEX IF NOT EXISTS api_keys_org_created_idx ON api_keys (org_id, created_at DESC);`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS api_request_logs (
      id UUID PRIMARY KEY,
      key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      action TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS organization_invitations (
      id UUID PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      accepted_at TIMESTAMPTZ,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS workflow_execution_logs (
      id UUID PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      succeeded BOOLEAN NOT NULL,
      steps JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS workflow_execution_logs_org_created_idx
    ON workflow_execution_logs (organization_id, created_at DESC)
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS workflows (
      id UUID PRIMARY KEY,
      org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      nodes_json JSONB NOT NULL,
      edges_json JSONB NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS workflows_org_updated_idx
    ON workflows (org_id, updated_at DESC)
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      bucket_key TEXT PRIMARY KEY,
      window_started_at TIMESTAMPTZ NOT NULL,
      request_count INTEGER NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS rate_limit_buckets_window_idx
    ON rate_limit_buckets (window_started_at)
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id UUID PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      currency CHAR(3) NOT NULL,
      description TEXT NOT NULL,
      method TEXT NOT NULL CHECK (method IN ('PAYSTACK', 'BANK_TRANSFER')),
      status TEXT NOT NULL CHECK (
        status IN ('PENDING', 'AWAITING_TRANSFER', 'PROOF_SUBMITTED', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED')
      ),
      reference TEXT NOT NULL UNIQUE,
      provider_transaction_id TEXT,
      proof_file TEXT,
      proof_mime TEXT,
      confirmed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS payment_orders_org_created_idx
    ON payment_orders (organization_id, created_at DESC)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS organization_invitations_pending_idx
    ON organization_invitations (organization_id, email, expires_at)
    WHERE accepted_at IS NULL
  `);

  // Real full-text search, built into Postgres — no extra service, no
  // extra API key. This index always works: it's core Postgres.
  await db.query(`
    CREATE INDEX IF NOT EXISTS projects_fts_idx
    ON projects USING GIN (to_tsvector('english', name));
  `);

  // pg_trgm adds typo-tolerant, fuzzy matching on top of that. Some
  // managed PostgreSQL roles cannot enable extensions.
  // If it fails, search still works via full-text + substring matching
  // above — it just won't forgive typos as gracefully.
  try {
    await db.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    await db.query(`
      CREATE INDEX IF NOT EXISTS projects_trgm_idx
      ON projects USING GIN (name gin_trgm_ops);
    `);
    trigramEnabled = true;
  } catch (err) {
    trigramEnabled = false;
    console.warn(
      "pg_trgm unavailable (search will still work, just without typo tolerance):",
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Runs a parameterized query. The first call per server instance creates
 * the tables (idempotent — CREATE TABLE IF NOT EXISTS), so there's no
 * separate migration step to run before this module works.
 *
 * If schema setup fails (e.g. a transient connection error, or a
 * scale-to-zero database still waking up), the failure is NOT cached —
 * the next call retries from scratch instead of failing forever for the
 * life of the server instance.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  if (!schemaReady) schemaReady = ensureSchema();
  try {
    await schemaReady;
  } catch (err) {
    schemaReady = null;
    throw new Error(
      `Database schema setup failed: ${err instanceof Error ? err.message : err}`
    );
  }
  try {
    const db = getPool();
    const res = await db.query<T>(text, params);
    return res.rows;
  } catch (err) {
    throw new Error(
      `Database query failed: ${err instanceof Error ? err.message : err}`
    );
  }
}

export async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!schemaReady) schemaReady = ensureSchema();
  try {
    await schemaReady;
  } catch (err) {
    schemaReady = null;
    throw new Error(
      `Database schema setup failed: ${err instanceof Error ? err.message : err}`
    );
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Database transaction rollback failed:", rollbackError);
    }
    const wrapped = new Error(
      `Database transaction failed: ${err instanceof Error ? err.message : err}`
    );
    if (typeof err === "object" && err !== null && "code" in err) {
      Object.defineProperty(wrapped, "code", { value: err.code });
    }
    throw wrapped;
  } finally {
    client.release();
  }
}

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Whether pg_trgm (typo-tolerant fuzzy matching) is available. Only
 * meaningful after the schema has been set up — call after any query(),
 * or await hasFuzzySearch() directly. */
export async function hasFuzzySearch(): Promise<boolean> {
  if (!schemaReady) schemaReady = ensureSchema();
  try {
    await schemaReady;
  } catch (err) {
    schemaReady = null;
    throw new Error(
      `Database schema setup failed: ${err instanceof Error ? err.message : err}`
    );
  }
  return trigramEnabled;
}
