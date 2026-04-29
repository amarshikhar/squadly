# Squadly · Brand Snapshot

## Name
**Squadly** — locked.

The name signals squad culture (universal in gaming) without being game-specific. Translates well across India + global markets. Available across major TLDs.

## Domain
**Recommended:** `squadly.gg` (available, gaming-native — confirmed via WHOIS Apr 2026)
**Alternates:** `squadly.live`, `squadly.in`, `squadly.club`, `squadly.team`
**Taken (avoid):** `squadly.com`, `squadly.io`

## Positioning

> **One-liner (customer):** "The home for India's gaming creators and the fans who power them."
>
> **One-liner (investor):** "Cameo + Patreon + Fiverr, built for the 467,000+ gaming creators in India. UPI-native, Discord-first, mobile-web optimized."

## Voice & tone

- **Tone:** Confident, direct, native to gaming culture — never tries too hard to be hip.
- **Vocabulary:** Squad, lobby, pass, vault, push, coach, level. Avoid "users" — use **fans, creators, pros**.
- **Microcopy patterns:**
  - CTA: "Get started", "Run your squad", "Bid now", "Top up", "Push goal"
  - Empty states: Direct, slightly sharp. Not apologetic. ("No bids yet. First one wins.")
  - Errors: Specific, actionable. Never generic ("Something went wrong").

## Logo direction

Phase 0 generated 4 directions. **Recommendation: V3 (geometric monogram)** — it scales as a favicon, has the most distinct mark, and the cyan→magenta gradient owns both brand colors.

| | V1 — Wordmark + S | V2 — Tactical Badge | V3 — Geometric Monogram | V4 — Display Wordmark |
|---|---|---|---|---|
| Symbol | ✅ | ✅ | ✅ (strongest) | ✗ |
| Favicon-friendly | ⚠️ medium | ⚠️ busy | ✅ | ✗ |
| Esports vibe | ⚠️ subtle | ✅ strong | ⚠️ subtle | ⚠️ subtle |
| Premium feel | ✅ | ⚠️ | ✅ | ✅ |
| Hand off to designer | ✅ | needs simplification | ✅ | ✅ |

Take V3 to a designer for SVG vectorization + animated reveal variants.

## Color palette

```
/* Backgrounds */
bg-0:    #070912   /* page */
bg-1:    #0d1322   /* section */
bg-2:    #131a2e   /* card surface */

/* Text */
text-0:  #f3f6ff   /* primary */
text-1:  #cdd5e8   /* body */
text-2:  #8a93ad   /* muted */
text-3:  #5b637b   /* deemphasised */

/* Neon accents */
neon-cyan:    #00f0ff   /* primary brand */
neon-magenta: #ff2eaa   /* secondary, lobby pass */
neon-green:   #7bffa4   /* success, ranks */
neon-amber:   #ffb800   /* games, warnings */
```

**Usage rules:**
- **Cyan** = primary brand, calls to action, growth/positive numbers, Squad Goals
- **Magenta** = secondary energy, Lobby Pass auctions, "scarcity" mechanics
- **Green** = Squad Ranks, success states, "winning" / "live" indicators
- **Amber** = Game tags, neutral highlights, hover states

## Typography

- **Display:** Space Grotesk (700, 600) — modern geometric, gaming-friendly
- **Body:** Inter (400, 500, 600, 700) — system-feel, optimal readability
- **Accent:** JetBrains Mono (400, 500, 600) — tags, stats, code-like accents

All three load via `next/font/google` (defined in `app/layout.tsx`).

## Iconography

- Use **Lucide React** for all generic UI icons
- Custom SVG marks for the 5 squad ranks (already implemented in `RankBadge`)
- Game logos: use official assets where licensed; otherwise emoji fallbacks (`🎯` BGMI, `🔫` Valorant, `🔥` Free Fire)

## Photography

- **Real over generated:** Always prefer real photos of Indian gaming creators / esports events / Discord communities
- **Avoid:** Cyberpunk stock, neon-particle AI art, sci-fi tropes
- **Embrace:** Documentary editorial — natural light, real spaces, identifiable subjects
- **Reference:** Wired, Bloomberg gaming features, Krafton tournament photography
