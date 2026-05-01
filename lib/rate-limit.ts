/**
 * Rate limiting via Upstash Redis sliding window.
 *
 * Falls back to allow-all if UPSTASH_REDIS_REST_URL isn't configured (dev-friendly).
 *
 * Usage in an API route:
 *
 *   import { rateLimit } from '@/lib/rate-limit';
 *
 *   export async function POST(req: Request) {
 *     const session = await auth();
 *     const id = session?.user?.id ?? clientIp(req);
 *     const rl = await rateLimit('coins', id, { max: 10, windowSec: 3600 });
 *     if (!rl.allowed) {
 *       return NextResponse.json({ error: 'rate_limited', retryAfter: rl.retryAfter },
 *         { status: 429, headers: { 'retry-after': String(rl.retryAfter) } });
 *     }
 *     ...
 *   }
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redis !== null) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

interface LimitOpts {
  max: number;
  windowSec: number;
}

interface LimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  fallback: boolean;
}

/**
 * Predefined limit profiles. Adjust these as you learn from real traffic.
 */
export const PROFILES = {
  signin:        { max: 10,  windowSec: 60 },        // 10 sign-in attempts/min per IP
  coins:         { max: 10,  windowSec: 3600 },      // 10 top-ups/hour per user
  bid:           { max: 30,  windowSec: 60 },        // 30 bids/min per user
  contribute:    { max: 20,  windowSec: 60 },        // 20 goal contribs/min per user
  message:       { max: 60,  windowSec: 60 },        // 60 messages/min per user
  service_create:{ max: 20,  windowSec: 3600 },      // 20 listings/hour per user
  request_create:{ max: 30,  windowSec: 3600 },      // 30 bookings/hour per user
  withdraw:      { max: 5,   windowSec: 3600 },      // 5 withdrawals/hour per user
  dispute:       { max: 5,   windowSec: 86400 },     // 5 disputes/day per user
} as const;

export type ProfileKey = keyof typeof PROFILES;

export async function rateLimit(profile: ProfileKey | string, identifier: string, opts?: LimitOpts): Promise<LimitResult> {
  const cfg = opts ?? PROFILES[profile as ProfileKey];
  if (!cfg) throw new Error(`Unknown rate-limit profile: ${profile}`);

  const r = getRedis();
  if (!r) {
    // Dev/no-Upstash mode: allow everything
    return { allowed: true, remaining: cfg.max, retryAfter: 0, fallback: true };
  }

  const cacheKey = `${profile}:${cfg.max}:${cfg.windowSec}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(cfg.max, `${cfg.windowSec} s`),
      prefix: `squadly:rl:${profile}`,
      analytics: false,
    });
    limiters.set(cacheKey, limiter);
  }

  const { success, remaining, reset } = await limiter.limit(identifier);
  return {
    allowed: success,
    remaining,
    retryAfter: Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
    fallback: false,
  };
}

/** Helper to extract a stable client identifier (user id or IP fallback). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
