-- ============================================================================
-- Squadly · Full Migration (NextAuth adapter tables + app schema)
-- Run in Supabase SQL Editor (single transaction)
-- ============================================================================

-- 1. NextAuth.js adapter tables (must exist before app tables)
-- These match the Drizzle adapter mapping in lib/auth/index.ts

CREATE TABLE IF NOT EXISTS account (
    "userId"            UUID NOT NULL,
    type                TEXT NOT NULL,
    provider            TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    refresh_token       TEXT,
    access_token        TEXT,
    expires_at          INTEGER,
    token_type          TEXT,
    scope               TEXT,
    id_token            TEXT,
    session_state       TEXT,
    PRIMARY KEY (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS session (
    "sessionToken"  TEXT PRIMARY KEY,
    "userId"        UUID NOT NULL,
    expires         TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_token (
    identifier  TEXT NOT NULL,
    token       TEXT NOT NULL,
    expires     TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (identifier, token)
);
