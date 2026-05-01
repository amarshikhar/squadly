-- ============================================================================
-- Squadly · Phase 3 migration
-- Adds: notifications, streaks, referrals, badges, badge_awards
-- Idempotent: uses IF NOT EXISTS so it's safe to re-run.
-- ============================================================================

-- New enums --------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'goal_funded',
    'goal_contribution_received',
    'request_pending',
    'request_accepted',
    'request_completed',
    'bid_outbid',
    'pass_won',
    'pass_lost',
    'message_received',
    'tier_promoted',
    'badge_awarded',
    'referral_redeemed',
    'system'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE referral_status AS ENUM ('pending', 'redeemed', 'rewarded', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE badge_code AS ENUM (
    'first_service_listed',
    'first_sale',
    'ten_sales',
    'hundred_sales',
    'first_goal_funded',
    'first_lobby_pass_won',
    'commander_tier',
    'verified_creator',
    'streak_7_day',
    'streak_30_day'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Notifications inbox ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT,
    link            TEXT,                           -- click destination (e.g. /requests/abc)
    actor_id        UUID REFERENCES users(id),       -- who triggered it
    related_id      UUID,                            -- generic FK to whatever (request, goal, pass, etc.)
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;

-- Daily streaks ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS streaks (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_days    INTEGER NOT NULL DEFAULT 0,
    longest_days    INTEGER NOT NULL DEFAULT 0,
    last_active_on  DATE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referral codes --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS referrals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code                TEXT NOT NULL UNIQUE,
    redeemed_by         UUID REFERENCES users(id),
    redeemed_at         TIMESTAMPTZ,
    rewarded_at         TIMESTAMPTZ,                                    -- when both sides got the bonus
    referrer_reward_coins INTEGER NOT NULL DEFAULT 100,
    redeemer_reward_coins INTEGER NOT NULL DEFAULT 100,
    status              referral_status NOT NULL DEFAULT 'pending',
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_redeemed_by ON referrals (redeemed_by);

-- Badges (definitions are static enum codes; awards are per-user) ------------

CREATE TABLE IF NOT EXISTS badge_awards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code            badge_code NOT NULL,
    awarded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, code)                                        -- award once per user
);
CREATE INDEX IF NOT EXISTS idx_badge_awards_user ON badge_awards (user_id);

-- RLS policies (user can read own data, server-role writes) -------------------

ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_awards   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY notifications_self_read ON notifications
      FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY streaks_self_read ON streaks
      FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY referrals_self_read ON referrals
      FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = redeemed_by);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY badge_awards_public_read ON badge_awards
      FOR SELECT USING (TRUE);                            -- public so badges show on profile
EXCEPTION WHEN duplicate_object THEN null; END $$;
