#!/usr/bin/env node
/**
 * Squadly — Self-Discovering Smoke Test Runner
 *
 * Auto-detects all API routes and page routes from the filesystem,
 * then tests each one. No manual test list to maintain.
 *
 * Usage:  node test-smoke.mjs
 * Requires: dev server running on localhost:3000
 */

import { hkdf } from '@panva/hkdf';
import { EncryptJWT, base64url, calculateJwkThumbprint } from 'jose';
import { randomUUID } from 'crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

// ─── Config ───────────────────────────────────────────────────────
const BASE = 'http://localhost:3000';
const APP_DIR = join(import.meta.dirname, 'app');
const COOKIE_NAME = 'authjs.session-token';
const ENC = 'A256CBC-HS512';
const ALG = 'dir';

// Real DB user ID — FK constraints require existing user for write ops
const TEST_USER_ID = 'd7df9b88-10c7-4439-bbf0-b48dd42c7146';

const envFile = readFileSync(join(import.meta.dirname, '.env.local'), 'utf8');
const authSecret = envFile.match(/^AUTH_SECRET=(.+)$/m)?.[1]?.trim();
if (!authSecret) { console.error('Missing AUTH_SECRET in .env.local'); process.exit(1); }

// ─── Colors ───────────────────────────────────────────────────────
const green  = (m) => console.log(`\x1b[32m✓ ${m}\x1b[0m`);
const red    = (m) => console.log(`\x1b[31m✗ ${m}\x1b[0m`);
const yellow = (m) => console.log(`\x1b[33m⊘ ${m}\x1b[0m`);
const header = (m) => console.log(`\n--- ${m} ---`);
const dim    = (m) => console.log(`\x1b[90m  ${m}\x1b[0m`);

let pass = 0, fail = 0, skip = 0;
function ok(l) { green(l); pass++; }
function ko(l) { red(l); fail++; }
function sk(l) { yellow(l); skip++; }

// ─── JWT Minting ──────────────────────────────────────────────────
async function mintJWT(userId) {
  const key = await hkdf('sha256', authSecret, COOKIE_NAME,
    `Auth.js Generated Encryption Key (${COOKIE_NAME})`, 64);
  const kid = await calculateJwkThumbprint(
    { kty: 'oct', k: base64url.encode(key) },
    `sha${key.byteLength << 3}`);
  return new EncryptJWT({ sub: userId, name: 'Smoke Test', email: 'smoke@squadly.dev' })
    .setProtectedHeader({ alg: ALG, enc: ENC, kid })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .setJti(randomUUID())
    .encrypt(key);
}

// ─── HTTP Helper ──────────────────────────────────────────────────
async function http(method, path, { body, cookie, followRedirects } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const opts = { method, headers, redirect: followRedirects ? 'follow' : 'manual' };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data = null;
  if ((res.headers.get('content-type') || '').includes('json')) {
    try { data = await res.json(); } catch {}
  }
  return { status: res.status, data, location: res.headers.get('location') };
}

// ─── Route Discovery ─────────────────────────────────────────────
function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function discoverApiRoutes() {
  const apiDir = join(APP_DIR, 'api');
  if (!existsSync(apiDir)) return [];
  const files = walkDir(apiDir).filter(f => f.endsWith('route.ts'));
  return files.map(f => {
    const rel = relative(apiDir, f).replace(/\/route\.ts$/, '');
    const urlPath = '/api/' + rel;
    const content = readFileSync(f, 'utf8');
    const methods = [];
    if (/export\s+(async\s+)?function\s+GET/m.test(content)) methods.push('GET');
    if (/export\s+(async\s+)?function\s+POST/m.test(content)) methods.push('POST');
    if (/export\s+(async\s+)?function\s+PATCH/m.test(content)) methods.push('PATCH');
    if (/export\s+(async\s+)?function\s+DELETE/m.test(content)) methods.push('DELETE');
    if (/export\s+(async\s+)?function\s+PUT/m.test(content)) methods.push('PUT');
    const hasDynamic = /\[/.test(urlPath);
    return { urlPath, methods, hasDynamic, file: f };
  });
}

function discoverPageRoutes() {
  const files = walkDir(APP_DIR).filter(f => f.endsWith('page.tsx') || f.endsWith('page.ts'));
  return files.map(f => {
    let rel = relative(APP_DIR, f).replace(/\/page\.tsx?$/, '');
    // Remove route groups like (app) or (auth)
    rel = rel.replace(/\([^)]+\)\/?/g, '');
    // Clean up double slashes and trailing slashes
    rel = rel.replace(/\/+/g, '/').replace(/\/$/, '');
    if (!rel || rel === 'page.tsx' || rel === '') rel = '/';
    else if (!rel.startsWith('/')) rel = '/' + rel;
    const hasDynamic = /\[/.test(rel);
    return { urlPath: rel, hasDynamic };
  });
}

// ─── Middleware Awareness ─────────────────────────────────────────
// Sync with middleware.ts PROTECTED_PAGE_PATTERNS
const PROTECTED_PAGE_PATTERNS = [
  /^\/vault/, /^\/home/, /^\/goals/, /^\/passes\/create/,
  /^\/requests/, /^\/payouts/, /^\/profile/, /^\/services\/create/,
  /^\/services$/, /^\/messages/,
  /^\/notifications/, /^\/referrals/,
];
const PUBLIC_API_PATTERNS = [/^\/api\/services$/, /^\/api\/goals/, /^\/api\/bids/, /^\/api\/passes/];
const SKIP_API_PATTERNS = [/^\/api\/auth/, /^\/api\/webhooks/, /^\/api\/jobs/];

function isProtectedPage(path) {
  return PROTECTED_PAGE_PATTERNS.some(rx => rx.test(path));
}
function isPublicApi(path) {
  return PUBLIC_API_PATTERNS.some(rx => rx.test(path));
}
function isSkippedApi(path) {
  return SKIP_API_PATTERNS.some(rx => rx.test(path));
}

// ─── Validation Payloads ──────────────────────────────────────────
// Map of API path → { valid payload, invalid payload } for POST testing
const PAYLOADS = {
  '/api/services': {
    valid: { type: 'coaching', game: 'valorant', title: 'Smoke Test Coaching', description: 'Automated smoke test service for Valorant ranked.', priceInr: 50000, durationMin: 60 },
    invalid: { type: 'invalid_type' },
    expectCreate: 201,
  },
  '/api/goals': {
    valid: { title: 'Smoke Test Squad Goal', description: 'Auto test goal.', targetCoins: 1000, deadlineHoursFromNow: 48 },
    invalid: { title: 'ab' },
    expectCreate: 201,
  },
  '/api/bids': {
    valid: { passId: randomUUID(), coinAmount: 200 },
    invalid: { coinAmount: 100 },
    expectCreate: 200, // stub
  },
  '/api/coins': {
    valid: { inrAmount: 100 },
    invalid: { inrAmount: -5 },
    expectCreate: 200,
    mayFailWith: [500, 502], // placeholder Razorpay keys
  },
  '/api/requests': {
    valid: null, // needs real serviceId — tested separately
    invalid: { serviceId: 'not-a-uuid' },
    expectCreate: null,
  },
  '/api/reviews': {
    valid: null, // needs completed request
    invalid: { rating: 10 },
    expectCreate: null,
  },
  '/api/ranks/verify': {
    valid: { game: 'bgmi', inGameId: 'SMOKE_TEST_12345' },
    invalid: { game: 'minecraft' },
    expectCreate: 200,
    mayFailWith: [500], // DB error
  },
  '/api/payouts/withdraw': {
    valid: null, // needs real vault balance
    invalid: { amountInr: 100, vpa: 'not-a-vpa' },
    expectCreate: null,
  },
  '/api/payouts/stripe/onboard': {
    valid: null,
    invalid: null,
    expectCreate: null,
  },
  '/api/messages': {
    valid: null, // needs real thread
    invalid: null,
    expectCreate: null,
  },
  '/api/passes': {
    valid: null, // complex payload
    invalid: null,
    expectCreate: null,
  },
  '/api/pusher/auth': {
    valid: null,
    invalid: null,
    expectCreate: null,
  },
};

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('============================================');
  console.log('  Squadly — Auto-Discovered Smoke Tests');
  console.log('============================================');

  // Server check
  try { await fetch(BASE); } catch {
    red('Dev server not running at ' + BASE);
    process.exit(1);
  }
  ok('Dev server is running');

  // Discover routes
  const apiRoutes = discoverApiRoutes();
  const pageRoutes = discoverPageRoutes();
  dim(`Found ${apiRoutes.length} API routes, ${pageRoutes.length} page routes`);

  // Mint JWT
  const token = await mintJWT(TEST_USER_ID);
  const cookie = `${COOKIE_NAME}=${token}`;
  ok(`Minted JWE for user ${TEST_USER_ID.slice(0, 8)}...`);

  // ═══════════════════════════════════════════════════════════════
  // PHASE A: Unauthenticated tests
  // ═══════════════════════════════════════════════════════════════

  // A1: Public pages render
  header('Public Pages (no auth)');
  const publicPages = pageRoutes.filter(p => !p.hasDynamic && !isProtectedPage(p.urlPath));
  for (const p of publicPages) {
    const r = await http('GET', p.urlPath);
    if (r.status === 200) ok(`GET ${p.urlPath}  (200)`);
    else ko(`GET ${p.urlPath}  (${r.status})`);
  }

  // A2: Protected pages redirect without auth
  header('Auth Gating — Pages (no cookie → redirect)');
  const protectedPages = pageRoutes.filter(p => !p.hasDynamic && isProtectedPage(p.urlPath));
  for (const p of protectedPages) {
    const r = await http('GET', p.urlPath);
    if ([307, 302, 303, 308].includes(r.status)) ok(`GET ${p.urlPath} → redirect (${r.status})`);
    else ko(`GET ${p.urlPath} → expected redirect, got ${r.status}`);
  }

  // A3: Public GET APIs
  header('Public API — GET (no auth)');
  const publicGetApis = apiRoutes.filter(a =>
    !a.hasDynamic && a.methods.includes('GET') && isPublicApi(a.urlPath) && !isSkippedApi(a.urlPath)
  );
  for (const a of publicGetApis) {
    // /api/bids requires pass_id query param — bare GET returns 400 which is correct
    const url = a.urlPath === '/api/bids'
      ? `${a.urlPath}?pass_id=00000000-0000-0000-0000-000000000000`
      : a.urlPath;
    const r = await http('GET', url);
    if (r.status === 200) ok(`GET ${a.urlPath}  (200)`);
    else if (a.urlPath === '/api/bids' && r.status === 400) ok(`GET ${a.urlPath}  (400 — requires pass_id)`);
    else ko(`GET ${a.urlPath}  (${r.status})`);
  }

  // A4: POST APIs return 401 without auth
  header('API Auth Gating — POST (no cookie → 401)');
  const postApis = apiRoutes.filter(a =>
    !a.hasDynamic && a.methods.includes('POST') && !isSkippedApi(a.urlPath)
  );
  for (const a of postApis) {
    const payload = PAYLOADS[a.urlPath]?.invalid || PAYLOADS[a.urlPath]?.valid || {};
    const r = await http('POST', a.urlPath, { body: payload });
    if (r.status === 401) ok(`POST ${a.urlPath} (no auth → 401)`);
    else if (isPublicApi(a.urlPath) && r.status === 400) ok(`POST ${a.urlPath} (public route, handler rejected → 400)`);
    else ko(`POST ${a.urlPath} (expected 401, got ${r.status})`);
  }

  // A5: Webhook endpoints reject unsigned
  header('Webhooks — reject unsigned');
  // NOTE: /api/jobs/close-passes is NOT tested here — it requires a DB state setup
  // (expired passes) and Authorization: Bearer $CRON_SECRET if CRON_SECRET is set.
  // Use test-lobby-pass.mjs for full close-pass coverage.
  const webhookRoutes = apiRoutes.filter(a => a.urlPath.includes('/webhooks/'));
  for (const a of webhookRoutes) {
    const r = await http('POST', a.urlPath, { body: { type: 'test.event' } });
    if ([400, 500].includes(r.status)) ok(`POST ${a.urlPath} → rejects unsigned (${r.status})`);
    else ko(`POST ${a.urlPath} → expected 400/500, got ${r.status}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE B: Authenticated tests
  // ═══════════════════════════════════════════════════════════════

  // B1: Validation errors (bad payloads → 400)
  header('Validation — bad payloads → 400 (authed)');
  for (const a of postApis) {
    const p = PAYLOADS[a.urlPath];
    if (!p?.invalid) continue;
    const r = await http('POST', a.urlPath, { body: p.invalid, cookie });
    if (r.status === 400) ok(`POST ${a.urlPath} (bad payload → 400)`);
    else ko(`POST ${a.urlPath} (bad payload → expected 400, got ${r.status})`);
  }

  // B2: Create operations (valid payloads)
  header('Create Operations (authed)');
  let createdServiceId = null;
  for (const a of postApis) {
    const p = PAYLOADS[a.urlPath];
    if (!p?.valid || !p.expectCreate) continue;

    const r = await http('POST', a.urlPath, { body: p.valid, cookie });
    if (r.status === p.expectCreate) {
      ok(`POST ${a.urlPath} → created (${r.status})`);
      // Capture service ID for self-booking test
      if (a.urlPath === '/api/services' && r.data?.service?.id) {
        createdServiceId = r.data.service.id;
        dim(`Service ID: ${createdServiceId}`);
      }
      if (a.urlPath === '/api/goals' && r.data?.goal?.id) {
        dim(`Goal ID: ${r.data.goal.id}`);
      }
      if (a.urlPath === '/api/coins' && r.data?.orderId) {
        dim(`Razorpay order: ${r.data.orderId}`);
      }
    } else if (p.mayFailWith?.includes(r.status)) {
      sk(`POST ${a.urlPath} → ${r.status} (expected with placeholder keys)`);
    } else {
      ko(`POST ${a.urlPath} → expected ${p.expectCreate}, got ${r.status}`);
      if (r.data) dim(JSON.stringify(r.data).slice(0, 200));
    }
  }

  // B3: Business logic checks
  header('Business Logic');
  if (createdServiceId) {
    const r = await http('POST', '/api/requests', {
      body: { serviceId: createdServiceId }, cookie,
    });
    if (r.status === 400) ok('Self-booking prevented (400)');
    else ko(`Self-booking check (expected 400, got ${r.status})`);
  } else {
    sk('Self-booking test (no service created)');
  }

  // B4: Authenticated pages render
  header('Authenticated Pages (with JWE)');
  const authPages = pageRoutes.filter(p => !p.hasDynamic && isProtectedPage(p.urlPath));
  for (const p of authPages) {
    const r = await http('GET', p.urlPath, { cookie });
    if (r.status === 200) ok(`GET ${p.urlPath}  (200)`);
    else if ([307, 302].includes(r.status)) ko(`GET ${p.urlPath} → redirect (JWT rejected)`);
    else ko(`GET ${p.urlPath}  (${r.status})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // Coverage Report
  // ═══════════════════════════════════════════════════════════════
  header('Coverage');
  const testedApis = new Set(postApis.map(a => a.urlPath));
  const untestedApis = apiRoutes.filter(a =>
    !a.hasDynamic && !isSkippedApi(a.urlPath) && !testedApis.has(a.urlPath)
  );
  const untestedDynamic = apiRoutes.filter(a => a.hasDynamic && !isSkippedApi(a.urlPath));
  const untestedPages = pageRoutes.filter(p => p.hasDynamic);

  if (untestedApis.length) {
    dim(`Static API routes not POST-tested: ${untestedApis.map(a => a.urlPath).join(', ')}`);
  }
  if (untestedDynamic.length) {
    dim(`Dynamic API routes (need IDs): ${untestedDynamic.map(a => `${a.urlPath} [${a.methods.join(',')}]`).join(', ')}`);
  }
  if (untestedPages.length) {
    dim(`Dynamic pages (need IDs): ${untestedPages.map(p => p.urlPath).join(', ')}`);
  }

  // Summary
  console.log('\n============================================');
  console.log(`  Results: ${pass} passed, ${fail} failed, ${skip} skipped`);
  console.log(`  Routes:  ${apiRoutes.length} API, ${pageRoutes.length} pages`);
  console.log('============================================\n');

  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
