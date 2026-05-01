-- ============================================================================
-- Squadly · Phase 4A migration — Trust & Safety basics
-- Adds: age verification fields on users, disputes table, admin role
-- Idempotent: safe to re-run.
-- ============================================================================

-- 1. Age verification fields on users ---------------------------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_18_plus       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_verified_at  TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob_year         SMALLINT;        -- year only (privacy minimization)

-- 2. Admin flag (so we can grant admin role without env var) ----------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin         BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Cookie consent (for DPDP/GDPR — record + version) ----------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_terms_v       TEXT;     -- e.g. '2026-05-01'
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_privacy_v     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_recorded_at   TIMESTAMPTZ;

-- 4. Disputes table ---------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE dispute_status AS ENUM (
    'open',                -- buyer raised it, awaiting admin
    'investigating',       -- admin acknowledged
    'resolved_creator',    -- admin sided with creator (no refund)
    'resolved_buyer',      -- admin sided with buyer (refund issued)
    'resolved_partial',    -- partial refund / split decision
    'cancelled'            -- buyer withdrew dispute
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS disputes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id      UUID NOT NULL UNIQUE REFERENCES service_requests(id),
    raised_by       UUID NOT NULL REFERENCES users(id),
    creator_id      UUID NOT NULL REFERENCES users(id),
    buyer_id        UUID NOT NULL REFERENCES users(id),
    reason          TEXT NOT NULL CHECK (length(reason) BETWEEN 10 AND 4000),
    creator_response TEXT,
    status          dispute_status NOT NULL DEFAULT 'open',
    resolved_by     UUID REFERENCES users(id),
    resolution_note TEXT,
    refund_inr      INTEGER,                                  -- nullable; how much was refunded if any
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disputes_status_open ON disputes (status) WHERE status IN ('open', 'investigating');
CREATE INDEX IF NOT EXISTS idx_disputes_buyer ON disputes (buyer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_creator ON disputes (creator_id);

-- RLS for disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY disputes_participant_read ON disputes
      FOR SELECT USING (auth.uid() IN (raised_by, creator_id, buyer_id));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. Audit table for ban actions (keeps a log even if we revert) ------------

CREATE TABLE IF NOT EXISTS user_audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    action          TEXT NOT NULL,                     -- 'banned', 'unbanned', 'age_verified', 'consent_recorded'
    actor_id        UUID REFERENCES users(id),         -- who performed the action; null for self-actions
    reason          TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON user_audit_log (user_id, created_at DESC);
