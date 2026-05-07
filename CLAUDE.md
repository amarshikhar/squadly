# Squadly — Claude Instructions

## Tech Stack
Next.js 15, TypeScript, Drizzle ORM, Supabase (Postgres + RLS), NextAuth, Razorpay, Stripe, Pusher, Upstash Redis, Vercel Cron/QStash, Riot Games API.

## Project Overview
Squadly is a social gaming platform where users buy/sell Lobby Passes (auction-based), set Squad Goals (crowdfunded contributions), offer services, and earn coins via dual payment gateway (Razorpay for India, Stripe for international). Key invariant: the Vault double-entry ledger must always balance.

## graphify

This project has a graphify knowledge graph at `graphify-out/`.

Rules:
- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure
- For cross-module "how does X relate to Y" questions, use:
  - `graphify query "<question>"` — BFS traversal for broad context
  - `graphify path "<A>" "<B>"` — shortest path between two concepts
  - `graphify explain "<concept>"` — plain-language explanation of a node
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
- graphify binary: `/Users/shikharamar/Desktop/Projects/Antigravity_Skills/.venv/bin/graphify`

## Key Architectural Patterns
- `lib/ledger.ts` — all coin mutations go through here (credit/debit/refund)
- `lib/db/queries.ts` — all DB queries centralized
- `lib/payments/` — Razorpay + Stripe clients (lazy-init via Proxy to avoid build-time errors)
- `lib/auth/` — NextAuth config + session helpers
- `lib/pusher.ts` — Pusher server client for realtime events
- `middleware.ts` — route protection + session validation

## Business Invariants (never break these)
1. Vault double-entry: every credit has a matching debit
2. Pass close is atomic: winner gets pass, coins transfer in one transaction
3. Razorpay webhooks verified via HMAC signature before processing
4. RLS enforces row-level access on all Supabase tables

## Testing
- `test-smoke.mjs` — auto-discovers all routes, checks 200/auth responses
- `test-dynamic.mjs` — integration tests for full coin/pass/goal flows
- `test-money-flow.ts` — financial invariant conservation tests
- `test-phase4a.mjs` — phase-specific test helpers
