-- ============================================================================
-- Squadly · PostgreSQL Schema
-- Run this in Supabase SQL editor or via `psql` against your Postgres DB.
-- All tables use UUID primary keys, timestamptz, and snake_case naming.
-- ============================================================================

-- Enable required extensions ---------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('fan', 'creator', 'both');
CREATE TYPE game_code AS ENUM ('bgmi', 'valorant', 'free_fire', 'dota2', 'cs2', 'cod_mobile', 'fortnite', 'mobile_legends', 'other');
CREATE TYPE service_type AS ENUM ('coaching', 'duo', 'rank_push', 'lineup', 'crosshair_fix', 'hype_reel', 'custom');
CREATE TYPE service_status AS ENUM ('draft', 'live', 'paused', 'archived');
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'disputed');
CREATE TYPE transaction_type AS ENUM ('coin_purchase', 'service_payment', 'service_payout', 'tip', 'goal_contribution', 'lobby_pass_bid', 'refund', 'platform_fee');
CREATE TYPE transaction_status AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE goal_status AS ENUM ('active', 'funded', 'expired', 'delivered', 'cancelled');
CREATE TYPE rank_tier AS ENUM ('recruit', 'soldier', 'veteran', 'legend', 'commander');
CREATE TYPE bid_status AS ENUM ('active', 'outbid', 'winning', 'won', 'refunded');
CREATE TYPE pass_status AS ENUM ('open', 'closed', 'fulfilled', 'cancelled');

-- ============================================================================
-- USERS & PROFILES
-- ============================================================================

-- Core user table; mirrors auth.users in Supabase
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           CITEXT UNIQUE NOT NULL,
    handle          CITEXT UNIQUE NOT NULL CHECK (handle ~ '^[a-z0-9_]{3,30}$'),
    display_name    TEXT NOT NULL,
    avatar_url      TEXT,
    bio             TEXT,
    role            user_role NOT NULL DEFAULT 'fan',
    is_provider     BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_handle ON users (handle);
CREATE INDEX idx_users_provider ON users (is_provider) WHERE is_provider = TRUE;

-- Provider profile extension (only meaningful when is_provider = true)
CREATE TABLE provider_profiles (
    user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    primary_game         game_code NOT NULL,
    discord_id           TEXT,
    discord_username     TEXT,
    instagram_handle     TEXT,
    youtube_channel      TEXT,
    twitch_channel       TEXT,
    payout_method        TEXT CHECK (payout_method IN ('razorpay_x', 'stripe_connect', 'manual')),
    razorpay_account_id  TEXT,
    stripe_account_id    TEXT,
    payout_kyc_status    TEXT CHECK (payout_kyc_status IN ('pending', 'verified', 'rejected')),
    avg_rating           NUMERIC(3, 2),
    total_completed      INTEGER NOT NULL DEFAULT 0,
    total_earned_inr     INTEGER NOT NULL DEFAULT 0,
    is_pro               BOOLEAN NOT NULL DEFAULT FALSE,
    pro_renewed_at       TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Game-rank verification per user per game
CREATE TABLE game_ranks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game            game_code NOT NULL,
    rank_label      TEXT NOT NULL,           -- "Conqueror", "Radiant", "Heroic", etc.
    in_game_id      TEXT,                    -- player ID for that game
    proof_url       TEXT,                    -- screenshot for manual verification
    verified_at     TIMESTAMPTZ,
    verified_via    TEXT CHECK (verified_via IN ('riot_api', 'manual', 'self_reported')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, game)
);

-- ============================================================================
-- SERVICES (productised offerings)
-- ============================================================================

CREATE TABLE services (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            service_type NOT NULL,
    game            game_code NOT NULL,
    title           TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 80),
    description     TEXT NOT NULL CHECK (length(description) BETWEEN 10 AND 2000),
    cover_image_url TEXT,
    price_inr       INTEGER NOT NULL CHECK (price_inr >= 0),                -- in paise (₹1 = 100 paise)
    duration_min    INTEGER NOT NULL CHECK (duration_min > 0),
    delivery_window_hours INTEGER NOT NULL DEFAULT 24,
    status          service_status NOT NULL DEFAULT 'draft',
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_services_creator ON services (creator_id);
CREATE INDEX idx_services_game ON services (game) WHERE status = 'live';
CREATE INDEX idx_services_status ON services (status);

-- Booking / request lifecycle
CREATE TABLE service_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id          UUID NOT NULL REFERENCES services(id),
    creator_id          UUID NOT NULL REFERENCES users(id),
    buyer_id            UUID NOT NULL REFERENCES users(id),
    status              request_status NOT NULL DEFAULT 'pending',
    price_inr_paid      INTEGER NOT NULL,
    platform_fee_inr    INTEGER NOT NULL,                           -- 15% of price_inr_paid
    creator_payout_inr  INTEGER NOT NULL,                           -- price - fee
    notes               TEXT,
    requested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at         TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    cancel_reason       TEXT,
    CHECK (creator_payout_inr = price_inr_paid - platform_fee_inr)
);
CREATE INDEX idx_requests_creator ON service_requests (creator_id);
CREATE INDEX idx_requests_buyer ON service_requests (buyer_id);
CREATE INDEX idx_requests_status ON service_requests (status);

-- ============================================================================
-- VAULT (wallet)
-- ============================================================================

-- Single source of truth for each user's INR + coin balances
CREATE TABLE vault_balances (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    inr_balance     INTEGER NOT NULL DEFAULT 0 CHECK (inr_balance >= 0),    -- paise
    coin_balance    INTEGER NOT NULL DEFAULT 0 CHECK (coin_balance >= 0),
    inr_pending     INTEGER NOT NULL DEFAULT 0 CHECK (inr_pending >= 0),    -- escrow for in-progress requests
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only ledger of every transaction
CREATE TABLE transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id),
    counterparty_id     UUID REFERENCES users(id),
    type                transaction_type NOT NULL,
    amount_inr          INTEGER NOT NULL DEFAULT 0,                          -- positive = credit, negative = debit
    amount_coins        INTEGER NOT NULL DEFAULT 0,
    status              transaction_status NOT NULL DEFAULT 'pending',
    related_request_id  UUID REFERENCES service_requests(id),
    related_goal_id     UUID,
    related_bid_id      UUID,
    gateway             TEXT CHECK (gateway IN ('razorpay', 'stripe', 'internal')),
    gateway_ref         TEXT,
    gateway_payload     JSONB,
    description         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    settled_at          TIMESTAMPTZ
);
CREATE INDEX idx_tx_user ON transactions (user_id, created_at DESC);
CREATE INDEX idx_tx_gateway_ref ON transactions (gateway_ref);
CREATE INDEX idx_tx_status ON transactions (status);

-- Coin purchase records (top-ups)
CREATE TABLE coin_purchases (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    coins           INTEGER NOT NULL CHECK (coins > 0),
    inr_paid        INTEGER NOT NULL CHECK (inr_paid > 0),                  -- paise
    gateway         TEXT NOT NULL CHECK (gateway IN ('razorpay', 'stripe')),
    gateway_ref     TEXT NOT NULL UNIQUE,
    status          transaction_status NOT NULL DEFAULT 'pending',
    transaction_id  UUID REFERENCES transactions(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    settled_at      TIMESTAMPTZ
);

-- ============================================================================
-- SQUAD GOALS (crowd-funded creator challenges)
-- ============================================================================

CREATE TABLE squad_goals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               TEXT NOT NULL CHECK (length(title) BETWEEN 5 AND 140),
    description         TEXT,
    target_coins        INTEGER NOT NULL CHECK (target_coins > 0),
    current_coins       INTEGER NOT NULL DEFAULT 0 CHECK (current_coins >= 0),
    contributors_count  INTEGER NOT NULL DEFAULT 0,
    status              goal_status NOT NULL DEFAULT 'active',
    deadline            TIMESTAMPTZ NOT NULL,
    funded_at           TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    delivery_proof_url  TEXT,                                              -- VOD/clip link the streamer posts
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goals_creator ON squad_goals (creator_id);
CREATE INDEX idx_goals_active ON squad_goals (status, deadline) WHERE status = 'active';

CREATE TABLE squad_goal_contributions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id         UUID NOT NULL REFERENCES squad_goals(id) ON DELETE CASCADE,
    fan_id          UUID NOT NULL REFERENCES users(id),
    coins           INTEGER NOT NULL CHECK (coins > 0),
    transaction_id  UUID NOT NULL REFERENCES transactions(id),
    contributed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contrib_goal ON squad_goal_contributions (goal_id, contributed_at DESC);

-- ============================================================================
-- SQUAD RANKS (per-creator loyalty ladder)
-- ============================================================================

-- Aggregated per (creator, fan) pair. Updated when fan spends coins toward creator.
CREATE TABLE squad_ranks (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fan_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_coins_spent       INTEGER NOT NULL DEFAULT 0 CHECK (total_coins_spent >= 0),
    period_coins_spent      INTEGER NOT NULL DEFAULT 0,                    -- resets quarterly
    current_tier            rank_tier NOT NULL DEFAULT 'recruit',
    rank_position           INTEGER,                                       -- nullable; computed periodically
    last_active_at          TIMESTAMPTZ,
    period_started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (creator_id, fan_id)
);
CREATE INDEX idx_ranks_creator ON squad_ranks (creator_id, period_coins_spent DESC);
CREATE INDEX idx_ranks_fan ON squad_ranks (fan_id);

-- ============================================================================
-- LOBBY PASS (time-boxed bidding)
-- ============================================================================

CREATE TABLE lobby_passes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               TEXT NOT NULL CHECK (length(title) BETWEEN 5 AND 140),
    description         TEXT,
    game                game_code NOT NULL,
    slot_count          INTEGER NOT NULL CHECK (slot_count BETWEEN 1 AND 10),
    min_bid_coins       INTEGER NOT NULL DEFAULT 100 CHECK (min_bid_coins > 0),
    bid_increment_coins INTEGER NOT NULL DEFAULT 50 CHECK (bid_increment_coins > 0),
    starts_at           TIMESTAMPTZ NOT NULL,
    ends_at             TIMESTAMPTZ NOT NULL,
    status              pass_status NOT NULL DEFAULT 'open',
    session_at          TIMESTAMPTZ NOT NULL,                                -- when the squad session happens
    session_duration_min INTEGER NOT NULL,
    fulfilled_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at),
    CHECK (session_at >= ends_at)
);
CREATE INDEX idx_passes_creator ON lobby_passes (creator_id);
CREATE INDEX idx_passes_open ON lobby_passes (status, ends_at) WHERE status = 'open';

CREATE TABLE lobby_pass_bids (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pass_id         UUID NOT NULL REFERENCES lobby_passes(id) ON DELETE CASCADE,
    bidder_id       UUID NOT NULL REFERENCES users(id),
    coin_amount     INTEGER NOT NULL CHECK (coin_amount > 0),
    status          bid_status NOT NULL DEFAULT 'active',
    transaction_id  UUID REFERENCES transactions(id),                       -- coins held in escrow
    bid_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    won_at          TIMESTAMPTZ,
    refunded_at     TIMESTAMPTZ
);
CREATE INDEX idx_bids_pass ON lobby_pass_bids (pass_id, coin_amount DESC);
CREATE INDEX idx_bids_bidder ON lobby_pass_bids (bidder_id, bid_at DESC);

-- ============================================================================
-- SOCIAL: REVIEWS & MESSAGES
-- ============================================================================

CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id      UUID NOT NULL UNIQUE REFERENCES service_requests(id),
    creator_id      UUID NOT NULL REFERENCES users(id),
    reviewer_id     UUID NOT NULL REFERENCES users(id),
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body            TEXT CHECK (length(body) <= 2000),
    is_hidden       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_creator ON reviews (creator_id) WHERE is_hidden = FALSE;

-- DM threads (post-purchase or post-bid only)
CREATE TABLE message_threads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id      UUID NOT NULL REFERENCES users(id),
    fan_id          UUID NOT NULL REFERENCES users(id),
    unlock_source   TEXT NOT NULL CHECK (unlock_source IN ('service_request', 'lobby_pass_won', 'commander_tier')),
    unlock_ref_id   UUID,
    last_message_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (creator_id, fan_id)
);

CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id       UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id),
    body            TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
    is_flagged      BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_thread ON messages (thread_id, sent_at DESC);

-- ============================================================================
-- TRIGGERS: keep updated_at fresh
-- ============================================================================

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_users_touch BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER tg_provider_profiles_touch BEFORE UPDATE ON provider_profiles
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER tg_services_touch BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER tg_goals_touch BEFORE UPDATE ON squad_goals
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER tg_ranks_touch BEFORE UPDATE ON squad_ranks
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER tg_passes_touch BEFORE UPDATE ON lobby_passes
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER tg_vault_touch BEFORE UPDATE ON vault_balances
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================================
-- VIEWS: useful read-side projections
-- ============================================================================

-- Top fans per creator (live leaderboard)
CREATE OR REPLACE VIEW v_top_fans_per_creator AS
SELECT
    sr.creator_id,
    sr.fan_id,
    u.handle AS fan_handle,
    u.display_name AS fan_display_name,
    u.avatar_url AS fan_avatar_url,
    sr.period_coins_spent,
    sr.current_tier,
    ROW_NUMBER() OVER (PARTITION BY sr.creator_id ORDER BY sr.period_coins_spent DESC) AS rank_position
FROM squad_ranks sr
JOIN users u ON u.id = sr.fan_id
WHERE sr.period_coins_spent > 0;

-- Active goals with progress
CREATE OR REPLACE VIEW v_active_goals AS
SELECT
    g.*,
    u.handle AS creator_handle,
    u.display_name AS creator_display_name,
    u.avatar_url AS creator_avatar_url,
    ROUND((g.current_coins::numeric / NULLIF(g.target_coins, 0)) * 100, 1) AS progress_pct,
    EXTRACT(EPOCH FROM (g.deadline - now())) AS seconds_remaining
FROM squad_goals g
JOIN users u ON u.id = g.creator_id
WHERE g.status = 'active' AND g.deadline > now();

-- ============================================================================
-- DONE
-- ============================================================================
