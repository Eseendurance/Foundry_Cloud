import { Pool, type QueryResultRow } from "pg";

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
      // Most managed Postgres providers (Neon, Supabase, Vercel Postgres)
      // sit behind a proxy with a cert that isn't in Node's default trust
      // store. This matches how their own connection snippets configure
      // ssl. If you're pointing at a self-hosted box with a full chain,
      // you can tighten this. Local Postgres without TLS still works if
      // your DATABASE_URL includes `?sslmode=disable`.
      ssl: process.env.DATABASE_URL?.includes("sslmode=disable")
        ? false
        : { rejectUnauthorized: false },
      max: 5,
      // Neon (and similar scale-to-zero providers) can take a few
      // seconds to wake a suspended compute on the first connection
      // after idle. Give that room instead of failing fast.
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
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sent_emails (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      link_url TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      opened_at TIMESTAMPTZ,
      click_count INTEGER NOT NULL DEFAULT 0
    );
  `);

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
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_hash TEXT UNIQUE NOT NULL,
      key_preview TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ
    );
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys (key_hash);`);

  // Real full-text search, built into Postgres — no extra service, no
  // extra API key. This index always works: it's core Postgres.
  await db.query(`
    CREATE INDEX IF NOT EXISTS projects_fts_idx
    ON projects USING GIN (to_tsvector('english', name));
  `);

  // pg_trgm adds typo-tolerant, fuzzy matching on top of that. Most
  // managed Postgres hosts (Neon, Supabase, Vercel Postgres, Railway)
  // let the app's own role enable it; a few locked-down hosts don't.
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
