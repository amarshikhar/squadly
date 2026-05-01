-- ============================================================================
-- Squadly · Seed data for local development
-- Run AFTER schema.sql + policies.sql.
-- Creates 5 streamers + their services, goals, bids, ranks.
-- ============================================================================

-- Disable RLS temporarily for seeding
SET LOCAL session_replication_role = 'replica';

-- Streamers (creators) ---------------------------------------------------------
INSERT INTO users (id, email, handle, display_name, avatar_url, bio, role, is_provider, is_verified) VALUES
    ('11111111-1111-1111-1111-111111111111', 'scout@squadly.gg', 'scout', 'Scout', 'https://i.pravatar.cc/150?img=12', 'Conqueror BGMI · Daily streams · Coaching for serious players', 'creator', TRUE, TRUE),
    ('22222222-2222-2222-2222-222222222222', 'gauravigl@squadly.gg', 'gauravigl', 'Gaurav IGL', 'https://i.pravatar.cc/150?img=33', 'Radiant Valorant · IGL & duo coach · Ex-pro', 'creator', TRUE, TRUE),
    ('33333333-3333-3333-3333-333333333333', 'riyaheadshot@squadly.gg', 'riyaheadshot', 'Riya Headshot', 'https://i.pravatar.cc/150?img=47', 'Free Fire creator · Heroic rank · Custom hype reels', 'creator', TRUE, TRUE),
    ('44444444-4444-4444-4444-444444444444', 'aniket7@squadly.gg', 'aniket7', 'Aniket7', 'https://i.pravatar.cc/150?img=8', 'BGMI sniper · Top 100 SEA · Lineup specialist', 'creator', TRUE, FALSE),
    ('55555555-5555-5555-5555-555555555555', 'jiyaragingg@squadly.gg', 'jiyaragingg', 'Jiya RagingG', 'https://i.pravatar.cc/150?img=24', 'Valorant smurf · Aim training · India server pro', 'creator', TRUE, FALSE);

-- Fans ------------------------------------------------------------------------
INSERT INTO users (id, email, handle, display_name, avatar_url, role) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fan1@example.com', 'karan_gg', 'Karan', 'https://i.pravatar.cc/150?img=51', 'fan'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'fan2@example.com', 'deepak_sniper', 'Deepak', 'https://i.pravatar.cc/150?img=52', 'fan'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'fan3@example.com', 'arjun_bgmi', 'Arjun', 'https://i.pravatar.cc/150?img=53', 'fan'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'fan4@example.com', 'meera_valor', 'Meera', 'https://i.pravatar.cc/150?img=54', 'fan'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'fan5@example.com', 'rohit_ace', 'Rohit', 'https://i.pravatar.cc/150?img=55', 'fan');

-- Provider profiles -----------------------------------------------------------
INSERT INTO provider_profiles (user_id, primary_game, instagram_handle, payout_method, avg_rating, total_completed, total_earned_inr) VALUES
    ('11111111-1111-1111-1111-111111111111', 'bgmi', '@scout.bgmi', 'razorpay_x', 4.9, 127, 285000),
    ('22222222-2222-2222-2222-222222222222', 'valorant', '@gaurav.igl', 'razorpay_x', 4.8, 89, 412000),
    ('33333333-3333-3333-3333-333333333333', 'free_fire', '@riya.ff', 'razorpay_x', 4.7, 56, 145000),
    ('44444444-4444-4444-4444-444444444444', 'bgmi', '@aniket.snipes', 'razorpay_x', 4.6, 32, 78000),
    ('55555555-5555-5555-5555-555555555555', 'valorant', '@jiya.gg', 'razorpay_x', 4.8, 41, 96000);

-- Game ranks ------------------------------------------------------------------
INSERT INTO game_ranks (user_id, game, rank_label, verified_via, verified_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'bgmi', 'Conqueror', 'manual', now()),
    ('22222222-2222-2222-2222-222222222222', 'valorant', 'Radiant', 'riot_api', now()),
    ('33333333-3333-3333-3333-333333333333', 'free_fire', 'Heroic', 'manual', now()),
    ('44444444-4444-4444-4444-444444444444', 'bgmi', 'Crown V', 'manual', now()),
    ('55555555-5555-5555-5555-555555555555', 'valorant', 'Immortal 3', 'riot_api', now());

-- Services --------------------------------------------------------------------
INSERT INTO services (id, creator_id, type, game, title, description, price_inr, duration_min, status) VALUES
    ('a1111111-aaaa-1111-aaaa-111111111111', '11111111-1111-1111-1111-111111111111', 'coaching', 'bgmi', '1-Hour BGMI Coaching · Conqueror', 'Personal review of your gameplay + drills tailored to your weaknesses. We''ll fix your aim, rotation, and final-zone decisions.', 50000, 60, 'live'),
    ('a2222222-aaaa-2222-aaaa-222222222222', '11111111-1111-1111-1111-111111111111', 'duo', 'bgmi', '5-Game Duo Push', 'Queue with me for 5 ranked matches. I''ll IGL and we''ll push points together.', 80000, 120, 'live'),
    ('a3333333-aaaa-3333-aaaa-333333333333', '22222222-2222-2222-2222-222222222222', 'coaching', 'valorant', 'Radiant Coaching · Aim & Crosshair', '90-min deep dive into your aim mechanics, crosshair placement, and lineup understanding.', 75000, 90, 'live'),
    ('a4444444-aaaa-4444-aaaa-444444444444', '22222222-2222-2222-2222-222222222222', 'lineup', 'valorant', 'Custom Lineup Pack · Any Map', 'I''ll create a complete lineup pack (smokes, mollies, recalls) for the map of your choice. Delivered in 48h.', 35000, 48 * 60, 'live'),
    ('a5555555-aaaa-5555-aaaa-555555555555', '33333333-3333-3333-3333-333333333333', 'hype_reel', 'free_fire', 'Custom Hype Reel · 30s', 'Cinematic 30-second hype reel of YOUR gameplay clips. Edited to your music.', 25000, 24 * 60, 'live'),
    ('a6666666-aaaa-6666-aaaa-666666666666', '44444444-4444-4444-4444-444444444444', 'rank_push', 'bgmi', 'Rank Push to Crown', 'Boost your account from Diamond to Crown in 7 days. Hand-played, no scripts.', 200000, 7 * 24 * 60, 'live'),
    ('a7777777-aaaa-7777-aaaa-777777777777', '55555555-5555-5555-5555-555555555555', 'crosshair_fix', 'valorant', 'Crosshair Fix Session · 30min', 'Quick session to dial in your perfect crosshair placement. Includes settings file.', 15000, 30, 'live');

-- Vault balances --------------------------------------------------------------
INSERT INTO vault_balances (user_id, inr_balance, coin_balance) VALUES
    ('11111111-1111-1111-1111-111111111111', 285000, 0),
    ('22222222-2222-2222-2222-222222222222', 412000, 0),
    ('33333333-3333-3333-3333-333333333333', 145000, 0),
    ('44444444-4444-4444-4444-444444444444', 78000, 0),
    ('55555555-5555-5555-5555-555555555555', 96000, 0),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0, 1500),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 0, 800),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 0, 2200),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 0, 350),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 0, 5400);

-- Squad Goals -----------------------------------------------------------------
INSERT INTO squad_goals (id, creator_id, title, description, target_coins, current_coins, contributors_count, status, deadline) VALUES
    ('b1111111-bbbb-1111-bbbb-111111111111', '11111111-1111-1111-1111-111111111111', 'Conqueror push tonight — full lobby, no leave', 'If we hit 1500 coins by 10pm IST, I go for back-to-back chickens until Conqueror.', 1500, 1250, 47, 'active', now() + interval '2 hours 14 minutes'),
    ('b2222222-bbbb-2222-bbbb-222222222222', '22222222-2222-2222-2222-222222222222', 'Surrender-free Saturday: 10 wins streak', 'Push to win 10 ranked games in a row — if I lose any, I refund all coins.', 3000, 1840, 23, 'active', now() + interval '5 hours'),
    ('b3333333-bbbb-3333-bbbb-333333333333', '33333333-3333-3333-3333-333333333333', 'Free Fire Heroic dash · 2 hour grind', 'Two-hour push session if we hit goal.', 800, 800, 18, 'funded', now() - interval '1 hour');

-- Goal contributions ----------------------------------------------------------
-- (Skipped for brevity — coin spend rolls up via squad_ranks)

-- Squad Ranks -----------------------------------------------------------------
INSERT INTO squad_ranks (creator_id, fan_id, total_coins_spent, period_coins_spent, current_tier, rank_position) VALUES
    ('11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 5400, 5400, 'commander', 1),
    ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 2200, 2200, 'legend', 2),
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1500, 1500, 'veteran', 3),
    ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 800, 800, 'veteran', 4),
    ('11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 350, 350, 'soldier', 5),
    ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 900, 900, 'veteran', 1),
    ('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 600, 600, 'veteran', 2);

-- Lobby Passes ----------------------------------------------------------------
INSERT INTO lobby_passes (id, creator_id, title, description, game, slot_count, min_bid_coins, ends_at, session_at, session_duration_min, starts_at) VALUES
    ('c1111111-cccc-1111-cccc-111111111111', '22222222-2222-2222-2222-222222222222', 'Pro Squad Night — full party play', '4-hour squad with me + my pro stack. Tonight 9pm IST.', 'valorant', 3, 200, now() + interval '42 minutes', now() + interval '6 hours', 240, now() - interval '4 hours'),
    ('c2222222-cccc-2222-cccc-222222222222', '11111111-1111-1111-1111-111111111111', 'BGMI Conqueror Lobby', '2-hour duo session at Conqueror lobby this Friday.', 'bgmi', 2, 300, now() + interval '1 day', now() + interval '3 days', 120, now());

-- Lobby Pass Bids -------------------------------------------------------------
INSERT INTO lobby_pass_bids (pass_id, bidder_id, coin_amount, status) VALUES
    ('c1111111-cccc-1111-cccc-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 850, 'winning'),
    ('c1111111-cccc-1111-cccc-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 820, 'outbid'),
    ('c1111111-cccc-1111-cccc-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 750, 'outbid'),
    ('c1111111-cccc-1111-cccc-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 700, 'outbid'),
    ('c1111111-cccc-1111-cccc-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 600, 'outbid');

-- Reviews ---------------------------------------------------------------------
INSERT INTO service_requests (id, service_id, creator_id, buyer_id, status, price_inr_paid, platform_fee_inr, creator_payout_inr, completed_at) VALUES
    ('d1111111-dddd-1111-dddd-111111111111', 'a1111111-aaaa-1111-aaaa-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'completed', 50000, 7500, 42500, now() - interval '3 days'),
    ('d2222222-dddd-2222-dddd-222222222222', 'a3333333-aaaa-3333-aaaa-333333333333', '22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'completed', 75000, 11250, 63750, now() - interval '7 days');

INSERT INTO reviews (request_id, creator_id, reviewer_id, rating, body) VALUES
    ('d1111111-dddd-1111-dddd-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, 'Insane session. Fixed my crosshair placement in 20 minutes. Pushed Crown the same week.'),
    ('d2222222-dddd-2222-dddd-222222222222', '22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5, 'Best Valorant coach I''ve worked with. Worth every rupee.');

-- Re-enable RLS
SET LOCAL session_replication_role = 'origin';
