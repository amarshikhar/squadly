-- Migration 005: add lobby_pass_payout to transaction_type enum
-- Required for crediting creators when a Lobby Pass auction closes.
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'lobby_pass_payout';
