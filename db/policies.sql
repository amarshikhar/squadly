-- ============================================================================
-- Squadly · Row-Level Security Policies (Supabase)
-- Run AFTER schema.sql.
-- These policies assume Supabase Auth where auth.uid() returns the user UUID.
-- ============================================================================

-- Enable RLS on every user-facing table
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_ranks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE services                ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_balances          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_purchases          ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_goals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_ranks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lobby_passes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE lobby_pass_bids         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS: public read; user can update own row
-- ============================================================================

CREATE POLICY users_public_read ON users
    FOR SELECT USING (NOT is_banned);

CREATE POLICY users_self_update ON users
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================================
-- PROVIDER PROFILES: public read for profiles where user.is_provider; user owns write
-- ============================================================================

CREATE POLICY provider_profiles_public_read ON provider_profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = provider_profiles.user_id AND users.is_provider AND NOT users.is_banned)
    );

CREATE POLICY provider_profiles_self_write ON provider_profiles
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- GAME RANKS: public read, self write
-- ============================================================================

CREATE POLICY game_ranks_public_read ON game_ranks
    FOR SELECT USING (TRUE);

CREATE POLICY game_ranks_self_write ON game_ranks
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SERVICES: public read live services; creator owns write
-- ============================================================================

CREATE POLICY services_public_read ON services
    FOR SELECT USING (status = 'live' OR auth.uid() = creator_id);

CREATE POLICY services_creator_write ON services
    FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- ============================================================================
-- SERVICE REQUESTS: only creator + buyer can read; service-role inserts via API
-- ============================================================================

CREATE POLICY requests_participant_read ON service_requests
    FOR SELECT USING (auth.uid() IN (creator_id, buyer_id));

-- Inserts and updates go through server-side API routes using the service-role key
-- so end-users never directly insert/update requests; no INSERT/UPDATE policy here.

-- ============================================================================
-- VAULT BALANCES: user reads own balance only
-- ============================================================================

CREATE POLICY vault_self_read ON vault_balances
    FOR SELECT USING (auth.uid() = user_id);

-- Writes happen exclusively via service-role (server-side ledger updates)

-- ============================================================================
-- TRANSACTIONS: user reads own ledger; never writes directly
-- ============================================================================

CREATE POLICY tx_self_read ON transactions
    FOR SELECT USING (auth.uid() IN (user_id, counterparty_id));

-- ============================================================================
-- COIN PURCHASES: user reads own; writes via server
-- ============================================================================

CREATE POLICY coin_self_read ON coin_purchases
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- SQUAD GOALS: public read live goals; creator writes
-- ============================================================================

CREATE POLICY goals_public_read ON squad_goals
    FOR SELECT USING (TRUE);

CREATE POLICY goals_creator_write ON squad_goals
    FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- ============================================================================
-- GOAL CONTRIBUTIONS: public read; writes via server (after coin debit)
-- ============================================================================

CREATE POLICY contrib_public_read ON squad_goal_contributions
    FOR SELECT USING (TRUE);

-- ============================================================================
-- SQUAD RANKS: public read; writes via server
-- ============================================================================

CREATE POLICY ranks_public_read ON squad_ranks
    FOR SELECT USING (TRUE);

-- ============================================================================
-- LOBBY PASSES: public read; creator writes
-- ============================================================================

CREATE POLICY passes_public_read ON lobby_passes
    FOR SELECT USING (TRUE);

CREATE POLICY passes_creator_write ON lobby_passes
    FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- ============================================================================
-- LOBBY PASS BIDS: bidder + creator can read; writes via server (escrow)
-- ============================================================================

CREATE POLICY bids_participant_read ON lobby_pass_bids
    FOR SELECT USING (
        auth.uid() = bidder_id
        OR auth.uid() IN (SELECT creator_id FROM lobby_passes WHERE id = lobby_pass_bids.pass_id)
    );

-- ============================================================================
-- REVIEWS: public read non-hidden; reviewer writes once
-- ============================================================================

CREATE POLICY reviews_public_read ON reviews
    FOR SELECT USING (NOT is_hidden);

CREATE POLICY reviews_reviewer_write ON reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- ============================================================================
-- MESSAGE THREADS & MESSAGES: only participants
-- ============================================================================

CREATE POLICY threads_participant_read ON message_threads
    FOR SELECT USING (auth.uid() IN (creator_id, fan_id));

CREATE POLICY messages_participant_read ON messages
    FOR SELECT USING (
        auth.uid() IN (
            SELECT creator_id FROM message_threads WHERE id = messages.thread_id
            UNION
            SELECT fan_id FROM message_threads WHERE id = messages.thread_id
        )
    );

CREATE POLICY messages_participant_write ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND auth.uid() IN (
            SELECT creator_id FROM message_threads WHERE id = thread_id
            UNION
            SELECT fan_id FROM message_threads WHERE id = thread_id
        )
    );
