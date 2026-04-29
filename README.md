# Squadly

> The home for India's gaming creators and the fans who power them.

A hybrid creator-fan + services marketplace built for India's 467,000+ gaming creators (BGMI, Valorant, Free Fire). Streamers monetize fans through bidding, ranks, and goal-funded challenges. Pros sell coaching, duos, and rank-pushes. UPI in. Stripe out. One Vault.

---

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui primitives + custom Squadly components
- **Database:** PostgreSQL on Supabase
- **ORM:** Drizzle (with raw SQL fallback in `db/`)
- **Auth:** NextAuth.js v5 — Apple, Google, Discord
- **Payments:** Razorpay (UPI, India primary) + Stripe Connect (international)
- **Storage:** Cloudflare R2
- **Realtime:** Pusher (bidding, goal progress)
- **Hosting:** Vercel

---

## Quickstart (local development)

### 1. Prerequisites

- Node.js **20+**
- pnpm **9+** (`npm install -g pnpm`)
- A Supabase project (free tier works) — see `SETUP.md`

### 2. Install

```bash
pnpm install
```

### 3. Environment

```bash
cp .env.example .env.local
```

Fill in at minimum these to get going:

- `AUTH_SECRET` — `openssl rand -base64 32`
- `DATABASE_URL` — your Supabase Postgres connection string (transaction pooler)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

OAuth providers can be added later — pages will render without them, sign-in just won't work until configured. See `SETUP.md` for full setup steps.

### 4. Database

```bash
# Apply schema + RLS policies + seed sample data
psql $DATABASE_URL -f db/schema.sql
psql $DATABASE_URL -f db/policies.sql
psql $DATABASE_URL -f db/seed.sql
```

Or use Drizzle to generate migrations from `lib/db/schema.ts`:

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Run

```bash
pnpm dev
```

Open <http://localhost:3000>.

---

## Project structure

```
squadly/
├── app/                 # Next.js App Router
│   ├── (auth)/signin    # Sign-in page
│   ├── (app)/           # Authed routes (home, vault, services, goals)
│   ├── [handle]/        # Public Streamer Hub (creator profile)
│   ├── api/             # API routes (services, goals, bids, coins, webhooks)
│   └── page.tsx         # Public landing
├── components/
│   ├── ui/              # shadcn primitives (button, card, badge)
│   └── squadly/         # Squadly-specific (goal-bar, rank-badge, lobby-pass-card, nav)
├── lib/
│   ├── db/              # Drizzle schema + client
│   ├── auth/            # NextAuth config
│   ├── payments/        # Razorpay + Stripe clients
│   ├── utils.ts         # cn(), formatters, tier helpers
│   └── constants.ts     # Game list, service types, tier thresholds, coin bundles
├── db/
│   ├── schema.sql       # Full PostgreSQL DDL
│   ├── policies.sql     # Supabase RLS policies
│   └── seed.sql         # Sample data for local dev
├── docs/
│   ├── BRAND.md         # Brand snapshot
│   └── ARCHITECTURE.md  # System architecture
├── middleware.ts        # Auth gate for protected routes
├── tailwind.config.ts   # Squadly design tokens
└── package.json
```

---

## Phase status

| Phase | Status |
|-------|--------|
| 0 · Foundation (this scaffold) | ✅ Complete |
| 1 · MVP Core (services, vault, requests) | 🟡 Stubbed routes & UI |
| 2 · Creator-Fan Layer (goals, ranks, bids) | 🟡 Schema + UI, no server logic |
| 3 · Engagement (push, feed, streaks) | ⚪ Not started |
| 4 · Trust & Safety | ⚪ Not started |
| 5 · Beta launch | ⚪ Not started |

---

## What's stubbed vs real

**Real:**
- Full database schema with RLS policies and seed data
- Tailwind design system with all Squadly tokens
- Reusable React components (GoalBar, RankBadge, LobbyPassCard)
- NextAuth.js configuration with three OAuth providers
- Razorpay + Stripe SDK initialization with webhook signature verification
- Public landing page, sign-in flow, profile page, services discovery, vault, goals — all rendering with mocked data

**Stubbed (`TODO` markers in code):**
- Coin → vault transactional ledger (the ACID logic for coin spend)
- Lobby Pass bid escrow + outbid logic
- Squad Goal contribution → tier promotion → leaderboard refresh
- Game-rank verification (Riot API integration)
- Real-time Pusher events
- Service request lifecycle (accepted → in-progress → completed → review)

Phase 1 fills in these gaps.

---

## License

Proprietary — all rights reserved.
