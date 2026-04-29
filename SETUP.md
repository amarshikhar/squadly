# Squadly · External Setup Checklist

Phase 0 produced the codebase. This file is what **you** need to do externally to get from "code on disk" to "running on the internet." Estimated time: 2–4 hours, mostly waiting for OAuth approvals.

Work through these in order. Each section ends with the env var(s) you'll have to copy back into `.env.local` (locally) and into Vercel's environment variables panel (production).

---

## ☐ 1. Domain registration (₹1,500–4,000/yr)

**Recommended:** `squadly.gg` — gaming-native, available as of writing.
**Alternatives:** `squadly.live`, `squadly.in` (cheaper, India-flavored), `squadly.club`.

Register at **Namecheap** or **Porkbun** (avoid GoDaddy if you can — pricier renewals).

Set DNS to point at Vercel later (step 4).

---

## ☐ 2. GitHub repository

```bash
gh repo create squadly --private --source=./squadly
git push -u origin main
```

Or via the GitHub web UI — create empty private repo, then locally:

```bash
cd squadly
git init && git add . && git commit -m "Phase 0 scaffold"
git remote add origin git@github.com:YOUR-USER/squadly.git
git push -u origin main
```

---

## ☐ 3. Supabase project (free)

1. Sign up at <https://supabase.com>
2. Create a new project (region: `ap-south-1` Mumbai for lowest India latency)
3. Wait ~3 min for provisioning
4. Get connection details from **Settings → Database**:
   - Connection string (transaction pooler) → `DATABASE_URL`
   - Direct connection (for migrations only) → `DIRECT_URL`
5. Get keys from **Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ keep secret, never commit)

6. Apply schema:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   psql "$DATABASE_URL" -f db/policies.sql
   psql "$DATABASE_URL" -f db/seed.sql
   ```

   Or paste each file's contents into Supabase's SQL editor.

---

## ☐ 4. Vercel deployment

1. Sign up at <https://vercel.com>
2. **Import** your GitHub repo
3. Framework preset: **Next.js** (auto-detected)
4. Add all env vars from `.env.example` in the **Environment Variables** panel
5. Deploy. Note the assigned `*.vercel.app` URL.
6. Add your custom domain (`squadly.gg`) — Vercel will give you DNS records to set at your registrar
7. Set `AUTH_URL` to your custom domain (`https://squadly.gg`) in Vercel env vars

---

## ☐ 5. Google OAuth

1. <https://console.cloud.google.com> → create project "Squadly"
2. **APIs & Services → OAuth consent screen** → fill in app info, add scopes: `email`, `profile`, `openid`
3. **Credentials → Create OAuth client ID** → type: Web app
4. **Authorized redirect URIs:**
   - `http://localhost:3000/api/auth/callback/google`
   - `https://squadly.gg/api/auth/callback/google`
5. Copy → `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`

---

## ☐ 6. Apple Sign-In ($99/year)

1. Enroll in **Apple Developer Program** (~$99/yr, takes 1–2 days for verification)
2. <https://developer.apple.com/account/resources/identifiers> → Create:
   - **App ID** for `gg.squadly.app` (enable Sign in with Apple)
   - **Services ID** for `gg.squadly.web` (this is what `AUTH_APPLE_ID` uses)
   - **Key** for Sign in with Apple — download `.p8` file
3. **Domains and redirect URLs:**
   - Domain: `squadly.gg`
   - Return URL: `https://squadly.gg/api/auth/callback/apple`
4. Generate the JWT client secret using your Team ID + Key ID + private key — see [next-auth Apple guide](https://authjs.dev/getting-started/providers/apple) for the helper script
5. → `AUTH_APPLE_ID` (Services ID) and `AUTH_APPLE_SECRET` (generated JWT)

---

## ☐ 7. Discord OAuth (free)

1. <https://discord.com/developers/applications> → New Application "Squadly"
2. **OAuth2 → Redirects:**
   - `http://localhost:3000/api/auth/callback/discord`
   - `https://squadly.gg/api/auth/callback/discord`
3. **OAuth2 → Reset Secret** → copy → `AUTH_DISCORD_SECRET`
4. **OAuth2 → Client ID** → copy → `AUTH_DISCORD_ID`

---

## ☐ 8. Razorpay (test mode first, free)

1. Sign up at <https://razorpay.com>
2. Stay in **test mode** until you're ready to launch with real money
3. **Settings → API Keys** → Generate test key:
   - Key ID → `RAZORPAY_KEY_ID` (starts with `rzp_test_`)
   - Key Secret → `RAZORPAY_KEY_SECRET`
4. **Settings → Webhooks** → Add webhook:
   - URL: `https://squadly.gg/api/webhooks/razorpay`
   - Events: `payment.captured`, `payment.failed`, `refund.processed`
   - Set a secret → `RAZORPAY_WEBHOOK_SECRET`
5. For production: complete KYC (PAN, GST, bank account), takes 2–5 business days

---

## ☐ 9. Stripe (test mode first, free)

1. Sign up at <https://stripe.com> (Indian entity supports INR + Connect)
2. **Developers → API keys** (test mode):
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
3. **Developers → Webhooks** → Add endpoint:
   - URL: `https://squadly.gg/api/webhooks/stripe` (you'll add this route in Phase 1)
   - Events: `payment_intent.succeeded`, `account.updated`, `payout.paid`
   - Reveal signing secret → `STRIPE_WEBHOOK_SECRET`
4. **Connect → Settings** → enable Connect, choose Express accounts model

---

## ☐ 10. Cloudflare R2 (storage)

1. Sign up / log in to Cloudflare
2. **R2** → Create bucket: `squadly-media`
3. Set up custom domain: `media.squadly.gg`
4. **Manage API Tokens → Create API Token** with R2 permissions:
   - Account ID → `R2_ACCOUNT_ID`
   - Access Key ID → `R2_ACCESS_KEY_ID`
   - Secret Access Key → `R2_SECRET_ACCESS_KEY`

---

## ☐ 11. Pusher (real-time, free tier ok)

1. Sign up at <https://pusher.com> (Channels product)
2. Create new app, region: **ap-south-1**
3. **App Keys** → copy:
   - app_id → `PUSHER_APP_ID`
   - key → `NEXT_PUBLIC_PUSHER_KEY`
   - secret → `PUSHER_SECRET`
   - cluster → `NEXT_PUBLIC_PUSHER_CLUSTER` (will be `ap2` for India)

---

## ☐ 12. Riot Games API (Valorant rank verification)

1. <https://developer.riotgames.com> → sign in with Riot account
2. Personal API key (for dev) → `RIOT_API_KEY`
3. For production traffic, apply for **Production API Key** — takes 1–2 weeks
4. Document your use case clearly: "rank verification for paid coaching marketplace"

---

## ☐ 13. Final verification

Once env vars are set in Vercel:

```bash
# Trigger a redeploy to pick up env changes
vercel --prod

# Sanity check:
# 1. https://squadly.gg loads
# 2. Sign-in flow with Google works
# 3. Database queries return seed data on /services
# 4. Test webhook with Razorpay's webhook tester
```

---

## What you do NOT need yet

These can wait until Phase 5 / launch:

- ⏳ Apple Developer account (only needed if you want iOS app or Apple sign-in)
- ⏳ Riot Production API (dev key works for first 50 verifications)
- ⏳ Production Razorpay (test mode works for closed beta)
- ⏳ Real custom domain email (use Gmail / ProtonMail aliasing initially)
- ⏳ GST registration (only required after ₹20L revenue)

---

## Cost summary (year 1, MVP scale)

| Item | Annual cost |
|------|------------|
| Domain (squadly.gg) | ₹2,500 |
| Vercel Hobby | Free |
| Supabase Free tier | Free (paid at scale) |
| Razorpay | 2% on transactions |
| Stripe | 2.9% + ₹2 on transactions |
| Cloudflare R2 | Free up to 10GB |
| Pusher Sandbox | Free up to 200K messages/day |
| Apple Developer | ₹8,300 |
| **Total fixed** | **~₹11,000** |

Variable costs scale with traffic — typically <2% of GMV until you hit ~50K MAU.
