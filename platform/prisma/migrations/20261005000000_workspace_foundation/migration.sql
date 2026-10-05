DO $$ BEGIN
  CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'FAILED', 'IN_PROGRESS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  plan_tier "PlanTier" NOT NULL DEFAULT 'FREE',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_tier "PlanTier" NOT NULL DEFAULT 'FREE';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE TABLE IF NOT EXISTS organization_memberships (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

INSERT INTO organizations (id, name)
SELECT md5('foundry-workspace:' || u.id)::uuid,
       split_part(u.email, '@', 1) || '''s workspace'
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM organization_memberships m WHERE m.user_id = u.id
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_memberships (organization_id, user_id, role)
SELECT md5('foundry-workspace:' || u.id)::uuid, u.id, 'owner'
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM organization_memberships m WHERE m.user_id = u.id
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE projects p SET org_id = m.organization_id
FROM organization_memberships m
WHERE p.user_id = m.user_id AND p.org_id IS NULL;
CREATE INDEX IF NOT EXISTS projects_org_created_idx ON projects (org_id, created_at DESC);

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
ALTER TABLE sent_emails ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE sent_emails e SET org_id = m.organization_id
FROM organization_memberships m
WHERE e.user_id = m.user_id AND e.org_id IS NULL;
CREATE INDEX IF NOT EXISTS sent_emails_org_sent_idx ON sent_emails (org_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS github_connections (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  github_login TEXT NOT NULL,
  access_token_enc TEXT NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix TEXT NOT NULL DEFAULT '';
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_preview TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS monthly_quota INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS current_usage INTEGER NOT NULL DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS usage_month DATE NOT NULL DEFAULT date_trunc('month', now())::date;
ALTER TABLE api_keys ALTER COLUMN status DROP DEFAULT;
ALTER TABLE api_keys ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE api_keys ALTER COLUMN status SET DEFAULT 'ACTIVE';
UPDATE api_keys k SET user_id = m.user_id
FROM organization_memberships m
WHERE k.org_id = m.organization_id AND m.role = 'owner' AND k.user_id IS NULL;
UPDATE api_keys
SET name = COALESCE(NULLIF(name, ''), label, 'Imported key'),
    key_preview = COALESCE(NULLIF(key_preview, ''), NULLIF(key_prefix, ''), 'fg_live_'),
    label = COALESCE(NULLIF(label, ''), name, 'Imported key'),
    key_prefix = COALESCE(NULLIF(key_prefix, ''), key_preview),
    status = CASE
      WHEN revoked_at IS NOT NULL OR status = 'REVOKED' THEN 'REVOKED'
      ELSE 'ACTIVE'
    END;
UPDATE api_keys SET revoked_at = now() WHERE status = 'REVOKED' AND revoked_at IS NULL;
UPDATE api_keys SET revoked_at = now(), status = 'REVOKED' WHERE user_id IS NULL;
ALTER TABLE api_keys ALTER COLUMN label SET NOT NULL;
ALTER TABLE api_keys ALTER COLUMN name SET NOT NULL;
ALTER TABLE api_keys ALTER COLUMN key_preview SET NOT NULL;
UPDATE api_keys k SET org_id = m.organization_id
FROM organization_memberships m
WHERE k.user_id = m.user_id AND k.org_id IS NULL;
DO $$ DECLARE constraint_row RECORD; BEGIN
  IF to_regclass('api_request_logs') IS NOT NULL THEN
    FOR constraint_row IN
      SELECT conname FROM pg_constraint
      WHERE conrelid = to_regclass('api_request_logs')
        AND confrelid = to_regclass('api_keys')
    LOOP
      EXECUTE format('ALTER TABLE api_request_logs DROP CONSTRAINT %I', constraint_row.conname);
    END LOOP;
  END IF;
END $$;
ALTER TABLE api_keys ALTER COLUMN id TYPE UUID USING id::uuid;
CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS api_keys_org_created_idx ON api_keys (org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID PRIMARY KEY,
  key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  action TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE api_request_logs ALTER COLUMN key_id TYPE UUID USING key_id::uuid;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('api_request_logs')
      AND confrelid = to_regclass('api_keys')
  ) THEN
    ALTER TABLE api_request_logs
      ADD CONSTRAINT api_request_logs_key_id_fkey
      FOREIGN KEY (key_id) REFERENCES api_keys(id) ON DELETE CASCADE;
  END IF;
END $$;

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
CREATE INDEX IF NOT EXISTS organization_invitations_pending_idx
ON organization_invitations (organization_id, email, expires_at)
WHERE accepted_at IS NULL;

CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  succeeded BOOLEAN NOT NULL,
  steps JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workflow_execution_logs_org_created_idx
ON workflow_execution_logs (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nodes_json JSONB NOT NULL,
  edges_json JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workflows_org_updated_idx
ON workflows (org_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_buckets_window_idx
ON rate_limit_buckets (window_started_at);

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
);
CREATE INDEX IF NOT EXISTS payment_orders_org_created_idx
ON payment_orders (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  license_type TEXT NOT NULL,
  refresh_cron TEXT NOT NULL DEFAULT '0 0 * * *',
  last_synced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS data_snapshots (
  id UUID PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  status "SyncStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingested_records (
  id UUID PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  entity_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, entity_key)
);
