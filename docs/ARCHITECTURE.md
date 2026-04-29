# Squadly · Architecture

## High-level

```
                    ┌──────────────────────────┐
                    │    Browser / mobile web   │
                    └────────────┬─────────────┘
                                 │ HTTPS
                                 ▼
                    ┌──────────────────────────┐
                    │      Vercel Edge          │
                    │   (Next.js 14 Server)    │
                    └────────────┬─────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────┐         ┌──────────────┐        ┌──────────────┐
│  Supabase    │         │  Razorpay /  │        │  Pusher      │
│  Postgres    │         │  Stripe      │        │  Channels    │
│  (auth+RLS)  │         │  (payments)  │        │  (realtime)  │
└──────────────┘         └──────────────┘        └──────────────┘
        │
        ▼
┌──────────────┐
│ Cloudflare R2│
│ (avatars,    │
│  cover art,  │
│  hype reels) │
└──────────────┘
```

## Request lifecycles

### 1. Coin top-up (fan buys coins)

1. Client posts `{ inrAmount }` to `/api/coins`
2. Server creates Razorpay Order, inserts `coin_purchases` row (status `pending`)
3. Returns `orderId` to client
4. Client opens Razorpay Checkout (UPI/cards/netbanking)
5. On success, Razorpay sends `payment.captured` webhook to `/api/webhooks/razorpay`
6. Webhook handler verifies signature, in a **transaction**:
   - Updates `coin_purchases.status` → `success`
   - Increments `vault_balances.coin_balance`
   - Inserts append-only `transactions` row
7. Pusher event broadcast → client UI updates Vault balance

### 2. Squad Goal contribution

1. Fan clicks "Contribute" with N coins on a goal
2. Client posts `{ goalId, coins }` to `/api/goals/contribute`
3. Server validates: goal is active, deadline not passed, fan has coins
4. In a transaction:
   - Decrement `vault_balances.coin_balance` by N
   - Insert `squad_goal_contributions` row
   - Increment `squad_goals.current_coins`
   - Upsert `squad_ranks` for (creator, fan) — increment `period_coins_spent`, recompute `current_tier`
   - Append `transactions` row (type `goal_contribution`)
   - If `current_coins >= target_coins`, mark goal `funded`
5. Pusher events broadcast → goal progress bar + top-fan leaderboard refresh

### 3. Lobby Pass bid

1. Fan submits `{ passId, coinAmount }` to `/api/bids`
2. Server validates: pass is `open`, ends_at > now, bid > current top + increment, fan has enough coins
3. In a transaction:
   - Move coins from fan's `coin_balance` → escrow (custom `coin_balance` reserved field, or hold via dedicated table)
   - If a previous bid exists on same pass, mark it `outbid` and refund coins
   - Insert new bid row with status `winning`
   - Update other active bids → status `outbid`
4. Pusher event broadcast → leaderboard updates live

### 4. Pass closes (cron job, every 60s)

1. Cron triggers `/api/jobs/close-passes`
2. For each pass where `ends_at <= now()` and `status = 'open'`:
   - Find top N bids (where N = `slot_count`)
   - Mark them `won`, refund the rest
   - Mark pass `closed`
   - Open DM threads between creator and each winner
   - Send notifications
   - Compute commission split on top bids → creator payout to vault

### 5. Service request lifecycle

```
pending → accepted → in_progress → completed → reviewed
            ↓
         cancelled (refund flow)
```

- `pending`: buyer paid; commission held in escrow
- `accepted`: creator confirms
- `in_progress`: creator marks started (e.g. session started)
- `completed`: creator marks done; payout (price - 15%) credited to creator's INR balance after 24h hold
- `reviewed`: buyer leaves review (1-5 stars + body)

## Data model invariants

These are validated at the application layer (not enforced as DB constraints because they involve multiple rows):

1. **Vault double-entry:** Sum of all `transactions.amount_inr` for a user must equal that user's `vault_balances.inr_balance` minus pending escrow.
2. **Goal sum:** `squad_goals.current_coins` must equal sum of `squad_goal_contributions.coins` for that goal.
3. **Rank tier consistency:** `squad_ranks.current_tier` must match `tierForCoins(period_coins_spent)`.
4. **Bid escrow:** sum of (active_bids × coin_amount) per user must be reflected as held coins (not double-counted in `coin_balance`).

## Background jobs (Phase 3+)

Triggered via Vercel Cron or QStash:

| Job | Frequency | Purpose |
|-----|-----------|---------|
| `close-expired-passes` | every 60s | Award winners, refund losers |
| `expire-stale-goals` | every 5 min | Mark expired/cancelled, refund contributions |
| `recompute-leaderboards` | hourly | Materialize top-fan rankings per creator |
| `quarterly-rank-reset` | quarterly | Reset `period_coins_spent`, archive snapshot |
| `payout-creators` | daily | Process Razorpay X / Stripe transfers for INR balances |
| `send-digest-emails` | daily | Engagement digest for fans + creators |

## Security posture

- **All sensitive operations** (payments, coin spend, payouts) flow through server-side API routes using the `service_role` Supabase key — never the anon key.
- **RLS policies** are the second line of defense; even with a leaked anon key, users can only read/write their own rows.
- **Signed webhooks:** every Razorpay/Stripe webhook signature is verified with HMAC.
- **Rate limiting:** apply at edge via Vercel firewall rules + per-route in-memory limiter (Upstash Ratelimit) for sign-in, bid-place, goal-contribute.
- **Content moderation:** integrate Sightengine (NSFW + harassment) on every uploaded image and DM message; flagged content goes to a human review queue.

## Scaling notes

- Postgres on Supabase scales to ~50K MAU on free tier; upgrade to Pro ($25/mo) early.
- Drop in Read Replicas for `services` and `users` queries when reads exceed writes 10:1.
- Move `messages` and `transactions` to partitioned tables when row count >10M.
- Move heavy computed views (top-fan leaderboards) into materialized views with triggered refresh.
