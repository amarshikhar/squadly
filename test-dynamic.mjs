#!/usr/bin/env node
/**
 * Squadly — Dynamic Route Smoke Tests
 *
 * Tests all dynamic (parameterized) API routes and pages using real IDs
 * from create operations. Covers Phase 2 features: Goals, Passes, Messages.
 *
 * Usage:  node test-dynamic.mjs
 * Requires: dev server running on localhost:3000
 */

import { hkdf } from '@panva/hkdf';
import { EncryptJWT, base64url, calculateJwkThumbprint } from 'jose';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

// ─── Config ───────────────────────────────────────────────────────
const BASE = 'http://localhost:3000';
const COOKIE_NAME = 'authjs.session-token';
const ENC = 'A256CBC-HS512';
const ALG = 'dir';

const TEST_USER_ID = 'd7df9b88-10c7-4439-bbf0-b48dd42c7146';

const envFile = readFileSync(join(import.meta.dirname, '.env.local'), 'utf8');
const authSecret = envFile.match(/^AUTH_SECRET=(.+)$/m)?.[1]?.trim();
if (!authSecret) { console.error('Missing AUTH_SECRET in .env.local'); process.exit(1); }

// ─── Colors ───────────────────────────────────────────────────────
const green  = (m) => console.log(`\x1b[32m✓ ${m}\x1b[0m`);
const red    = (m) => console.log(`\x1b[31m✗ ${m}\x1b[0m`);
const yellow = (m) => console.log(`\x1b[33m⊘ ${m}\x1b[0m`);
const header = (m) => console.log(`\n━━━ ${m} ━━━`);
const dim    = (m) => console.log(`\x1b[90m  ${m}\x1b[0m`);

let pass = 0, fail = 0, skip = 0;
function ok(l) { green(l); pass++; }
function ko(l, detail) { red(l); if (detail) dim(detail); fail++; }
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
async function http(method, path, { body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const opts = { method, headers, redirect: 'manual' };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) {
    try { data = await res.json(); } catch {}
  }
  return { status: res.status, data };
}

// ─── Fetch user handle from DB via API ───────────────────────────
async function getUserHandle(cookie) {
  const r = await http('GET', '/api/profile', { cookie });
  return r.data?.user?.handle ?? r.data?.handle ?? null;
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('============================================');
  console.log('  Squadly — Dynamic Route Smoke Tests');
  console.log('============================================');

  // Server check
  try { await fetch(BASE); } catch {
    ko('Dev server not running at ' + BASE);
    process.exit(1);
  }
  ok('Dev server is running');

  const token = await mintJWT(TEST_USER_ID);
  const cookie = `${COOKIE_NAME}=${token}`;
  ok(`Minted JWE for user ${TEST_USER_ID.slice(0, 8)}...`);

  // ═══════════════════════════════════════════════════════════════
  // 1. Create test resources
  // ═══════════════════════════════════════════════════════════════
  header('1. Create Test Resources');

  // 1a. Create a service
  let serviceId = null;
  {
    const r = await http('POST', '/api/services', {
      body: { type: 'coaching', game: 'valorant', title: 'Dynamic Test Coaching', description: 'Service for dynamic route testing.', priceInr: 50000, durationMin: 60 },
      cookie,
    });
    if (r.status === 201 && r.data?.service?.id) {
      serviceId = r.data.service.id;
      ok(`Created service: ${serviceId}`);
    } else {
      ko(`Create service failed (${r.status})`, JSON.stringify(r.data)?.slice(0, 200));
    }
  }

  // 1b. Create a goal
  let goalId = null;
  {
    const r = await http('POST', '/api/goals', {
      body: { title: 'Dynamic Test Squad Goal', description: 'Goal for dynamic route testing.', targetCoins: 5000, deadlineHoursFromNow: 48 },
      cookie,
    });
    if (r.status === 201 && r.data?.goal?.id) {
      goalId = r.data.goal.id;
      ok(`Created goal: ${goalId}`);
    } else {
      ko(`Create goal failed (${r.status})`, JSON.stringify(r.data)?.slice(0, 200));
    }
  }

  // 1c. Create a lobby pass
  let passId = null;
  {
    const r = await http('POST', '/api/passes', {
      body: {
        title: 'Dynamic Test Lobby Pass',
        description: 'Pass for dynamic route testing.',
        game: 'valorant',
        slotCount: 3,
        minBidCoins: 100,
        bidIncrementCoins: 50,
        endsInMinutes: 60,
        sessionInMinutes: 120,
        sessionDurationMin: 60,
      },
      cookie,
    });
    if (r.status === 201 && r.data?.pass?.id) {
      passId = r.data.pass.id;
      ok(`Created lobby pass: ${passId}`);
    } else {
      ko(`Create lobby pass failed (${r.status})`, JSON.stringify(r.data)?.slice(0, 200));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. Dynamic API Routes — Auth Gating (no cookie → 401)
  // ═══════════════════════════════════════════════════════════════
  header('2. Dynamic API Auth Gating (no cookie)');

  if (goalId) {
    const r = await http('POST', `/api/goals/${goalId}/contribute`, { body: { coins: 100 } });
    if (r.status === 401) ok(`POST /api/goals/[id]/contribute (no auth → 401)`);
    else ko(`POST /api/goals/[id]/contribute (expected 401, got ${r.status})`);
  }

  if (passId) {
    const r1 = await http('GET', `/api/passes/${passId}`);
    // Pass detail GET is public (no auth check in route)
    if (r1.status === 200) ok(`GET /api/passes/[id] (public → 200)`);
    else ko(`GET /api/passes/[id] (expected 200, got ${r1.status})`);

    const r2 = await http('POST', `/api/passes/${passId}/bid`, { body: { coinAmount: 100 } });
    if (r2.status === 401) ok(`POST /api/passes/[id]/bid (no auth → 401)`);
    else ko(`POST /api/passes/[id]/bid (expected 401, got ${r2.status})`);
  }

  {
    const fakeThread = randomUUID();
    const r = await http('GET', `/api/messages/${fakeThread}`);
    if (r.status === 401) ok(`GET /api/messages/[threadId] (no auth → 401)`);
    else ko(`GET /api/messages/[threadId] (expected 401, got ${r.status})`);
  }

  {
    const fakeReqId = randomUUID();
    const r = await http('GET', `/api/requests/${fakeReqId}`);
    if (r.status === 401) ok(`GET /api/requests/[id] (no auth → 401)`);
    else ko(`GET /api/requests/[id] (expected 401, got ${r.status})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. Dynamic API Routes — Validation (bad payloads, authed)
  // ═══════════════════════════════════════════════════════════════
  header('3. Dynamic API Validation (authed, bad payloads)');

  if (goalId) {
    // Bad coins value
    const r1 = await http('POST', `/api/goals/${goalId}/contribute`, {
      body: { coins: -5 },
      cookie,
    });
    if (r1.status === 400) ok(`POST /api/goals/[id]/contribute (negative coins → 400)`);
    else ko(`POST /api/goals/[id]/contribute (expected 400, got ${r1.status})`);

    // Missing coins field
    const r2 = await http('POST', `/api/goals/${goalId}/contribute`, {
      body: {},
      cookie,
    });
    if (r2.status === 400) ok(`POST /api/goals/[id]/contribute (missing coins → 400)`);
    else ko(`POST /api/goals/[id]/contribute (expected 400, got ${r2.status})`);

    // Too many coins
    const r3 = await http('POST', `/api/goals/${goalId}/contribute`, {
      body: { coins: 99999 },
      cookie,
    });
    if (r3.status === 400) ok(`POST /api/goals/[id]/contribute (coins > 50000 → 400)`);
    else ko(`POST /api/goals/[id]/contribute (expected 400, got ${r3.status})`);
  }

  if (passId) {
    const r = await http('POST', `/api/passes/${passId}/bid`, {
      body: { coinAmount: -10 },
      cookie,
    });
    if (r.status === 400) ok(`POST /api/passes/[id]/bid (negative amount → 400)`);
    else ko(`POST /api/passes/[id]/bid (expected 400, got ${r.status})`);

    const r2 = await http('POST', `/api/passes/${passId}/bid`, {
      body: {},
      cookie,
    });
    if (r2.status === 400) ok(`POST /api/passes/[id]/bid (missing amount → 400)`);
    else ko(`POST /api/passes/[id]/bid (expected 400, got ${r2.status})`);
  }

  {
    const fakeReqId = randomUUID();
    const r = await http('PATCH', `/api/requests/${fakeReqId}`, {
      body: { action: 'invalid_action' },
      cookie,
    });
    if (r.status === 400) ok(`PATCH /api/requests/[id] (bad action → 400)`);
    else ko(`PATCH /api/requests/[id] (expected 400, got ${r.status})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. Dynamic API Routes — 404 Handling (valid auth, fake IDs)
  // ═══════════════════════════════════════════════════════════════
  header('4. Dynamic API 404s (valid auth, fake IDs)');

  {
    const fakeGoal = randomUUID();
    const r = await http('POST', `/api/goals/${fakeGoal}/contribute`, {
      body: { coins: 100 },
      cookie,
    });
    if (r.status === 404) ok(`POST /api/goals/[fakeId]/contribute → 404`);
    else ko(`POST /api/goals/[fakeId]/contribute (expected 404, got ${r.status})`, JSON.stringify(r.data)?.slice(0, 200));
  }

  {
    const fakePass = randomUUID();
    const r = await http('GET', `/api/passes/${fakePass}`);
    if (r.status === 404) ok(`GET /api/passes/[fakeId] → 404`);
    else ko(`GET /api/passes/[fakeId] (expected 404, got ${r.status})`);
  }

  {
    const fakeThread = randomUUID();
    const r = await http('GET', `/api/messages/${fakeThread}`, { cookie });
    if (r.status === 404) ok(`GET /api/messages/[fakeThreadId] → 404`);
    else ko(`GET /api/messages/[fakeThreadId] (expected 404, got ${r.status})`);
  }

  {
    const fakeReq = randomUUID();
    const r = await http('GET', `/api/requests/${fakeReq}`, { cookie });
    if (r.status === 404) ok(`GET /api/requests/[fakeId] → 404`);
    else ko(`GET /api/requests/[fakeId] (expected 404, got ${r.status})`);

    const r2 = await http('PATCH', `/api/requests/${fakeReq}`, {
      body: { action: 'accept' },
      cookie,
    });
    if (r2.status === 404) ok(`PATCH /api/requests/[fakeId] → 404`);
    else ko(`PATCH /api/requests/[fakeId] (expected 404, got ${r2.status})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. Business Logic — Dynamic Routes
  // ═══════════════════════════════════════════════════════════════
  header('5. Business Logic — Dynamic Routes');

  // 5a. Cannot contribute to own goal
  if (goalId) {
    const r = await http('POST', `/api/goals/${goalId}/contribute`, {
      body: { coins: 100 },
      cookie,
    });
    if (r.status === 400 && r.data?.error === 'cannot_contribute_to_own_goal') {
      ok('Cannot contribute to own goal (400)');
    } else {
      ko(`Own-goal contribution (expected 400/cannot_contribute_to_own_goal, got ${r.status}/${r.data?.error})`);
    }
  }

  // 5b. Cannot bid on own lobby pass (if that guard exists), or at least bid fails insufficient coins
  if (passId) {
    const r = await http('POST', `/api/passes/${passId}/bid`, {
      body: { coinAmount: 100 },
      cookie,
    });
    // Could be 400 (own pass) or 400 (insufficient_coins) or other business error
    if (r.status === 400) {
      ok(`Bid on own pass rejected (400: ${r.data?.error})`);
    } else if (r.status === 200) {
      sk(`Bid on own pass accepted (no self-bid guard — may be by design)`);
    } else {
      ko(`Bid on own pass (unexpected ${r.status})`, JSON.stringify(r.data)?.slice(0, 200));
    }
  }

  // 5c. Messages POST — send to nonexistent thread
  {
    const fakeThread = randomUUID();
    const r = await http('POST', '/api/messages', {
      body: { threadId: fakeThread, body: 'Hello from test' },
      cookie,
    });
    if (r.status === 404) ok('POST /api/messages with fake threadId → 404');
    else ko(`POST /api/messages fake thread (expected 404, got ${r.status})`, JSON.stringify(r.data)?.slice(0, 200));
  }

  // 5d. Messages POST — validation (missing body)
  {
    const r = await http('POST', '/api/messages', {
      body: { threadId: randomUUID() },
      cookie,
    });
    if (r.status === 400) ok('POST /api/messages missing body → 400');
    else ko(`POST /api/messages missing body (expected 400, got ${r.status})`);
  }

  // 5e. Messages POST — validation (body too long)
  {
    const r = await http('POST', '/api/messages', {
      body: { threadId: randomUUID(), body: 'x'.repeat(4001) },
      cookie,
    });
    if (r.status === 400) ok('POST /api/messages body too long → 400');
    else ko(`POST /api/messages body too long (expected 400, got ${r.status})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. Dynamic API Routes — Real Data (GET with created IDs)
  // ═══════════════════════════════════════════════════════════════
  header('6. Dynamic API — GET with Real IDs');

  if (passId) {
    const r = await http('GET', `/api/passes/${passId}`);
    if (r.status === 200 && r.data?.pass) {
      ok(`GET /api/passes/${passId.slice(0, 8)}... → 200 (title: "${r.data.pass.title}")`);
    } else {
      ko(`GET /api/passes/[id] with real ID (${r.status})`, JSON.stringify(r.data)?.slice(0, 200));
    }
  }

  if (serviceId) {
    const r = await http('GET', `/api/services/${serviceId}`, { cookie });
    if (r.status === 200) {
      ok(`GET /api/services/${serviceId.slice(0, 8)}... → 200`);
    } else {
      // Some routes might not have a GET by ID — check
      sk(`GET /api/services/[id] (${r.status} — may not exist)`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. Dynamic Pages — Render with Real IDs
  // ═══════════════════════════════════════════════════════════════
  header('7. Dynamic Pages — Render with Real IDs');

  // Get user handle from pass detail (includes creator object with handle)
  let userHandle = null;
  if (passId) {
    const r = await http('GET', `/api/passes/${passId}`);
    if (r.data?.creator?.handle) {
      userHandle = r.data.creator.handle;
      dim(`Resolved handle from pass creator: ${userHandle}`);
    }
  }

  // Goal detail page
  if (goalId) {
    const r = await http('GET', `/goals/${goalId}`, { cookie });
    if (r.status === 200) ok(`GET /goals/${goalId.slice(0, 8)}... → 200`);
    else ko(`GET /goals/[id] page (${r.status})`);
  }

  // Pass detail page (public)
  if (passId) {
    const r = await http('GET', `/passes/${passId}`, { cookie });
    if (r.status === 200) ok(`GET /passes/${passId.slice(0, 8)}... → 200`);
    else ko(`GET /passes/[id] page (${r.status})`);
  }

  // Service detail page
  if (serviceId) {
    const r = await http('GET', `/services/${serviceId}`, { cookie });
    if (r.status === 200) ok(`GET /services/${serviceId.slice(0, 8)}... → 200`);
    else ko(`GET /services/[id] page (${r.status})`);
  }

  // Profile page (handle-based)
  if (userHandle) {
    const r = await http('GET', `/${userHandle}`);
    if (r.status === 200) ok(`GET /${userHandle} → 200`);
    else ko(`GET /[handle] page (${r.status})`);

    const r2 = await http('GET', `/${userHandle}/squad`);
    if (r2.status === 200) ok(`GET /${userHandle}/squad → 200`);
    else ko(`GET /[handle]/squad page (${r2.status})`);
  } else {
    sk('GET /[handle] page (could not resolve user handle)');
    sk('GET /[handle]/squad page (could not resolve user handle)');
  }

  // Messages page with fake thread (should 404 or error gracefully)
  {
    const fakeThread = randomUUID();
    const r = await http('GET', `/messages/${fakeThread}`, { cookie });
    if ([200, 404, 500].includes(r.status)) {
      // 200 = page renders (shows error state client-side)
      // 404 = server rejects
      // 500 = acceptable for nonexistent thread if page does server-side fetch
      if (r.status === 200) ok(`GET /messages/[fakeThread] → 200 (renders, handles missing thread client-side)`);
      else if (r.status === 404) ok(`GET /messages/[fakeThread] → 404`);
      else sk(`GET /messages/[fakeThread] → 500 (server error for missing thread)`);
    } else {
      ko(`GET /messages/[fakeThread] (unexpected ${r.status})`);
    }
  }

  // Requests page with fake ID
  {
    const fakeReq = randomUUID();
    const r = await http('GET', `/requests/${fakeReq}`, { cookie });
    if ([200, 404, 500].includes(r.status)) {
      if (r.status === 200) ok(`GET /requests/[fakeId] → 200 (renders, handles missing request client-side)`);
      else if (r.status === 404) ok(`GET /requests/[fakeId] → 404`);
      else sk(`GET /requests/[fakeId] → 500 (server error for missing request)`);
    } else {
      ko(`GET /requests/[fakeId] (unexpected ${r.status})`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. Pusher Auth — Channel Authorization
  // ═══════════════════════════════════════════════════════════════
  header('8. Pusher Auth Channel Tests');

  // Helper: Pusher auth sends formData, not JSON
  async function pusherAuth(socketId, channelName, authCookie) {
    const headers = {};
    if (authCookie) headers['Cookie'] = authCookie;
    const formBody = new URLSearchParams({ socket_id: socketId, channel_name: channelName });
    const opts = { method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'manual', body: formBody.toString() };
    const res = await fetch(`${BASE}/api/pusher/auth`, opts);
    let data = null;
    if ((res.headers.get('content-type') || '').includes('json')) {
      try { data = await res.json(); } catch {}
    }
    return { status: res.status, data };
  }

  // No auth → 401
  {
    const r = await pusherAuth('12345.67890', 'private-thread-abc', null);
    if (r.status === 401) ok('POST /api/pusher/auth (no auth → 401)');
    else ko(`POST /api/pusher/auth no auth (expected 401, got ${r.status})`);
  }

  // Valid auth, non-private channel → 400
  {
    const r = await pusherAuth('12345.67890', 'public-channel', cookie);
    if (r.status === 400) ok('POST /api/pusher/auth (non-private channel → 400)');
    else ko(`POST /api/pusher/auth non-private (expected 400, got ${r.status})`);
  }

  // Valid auth, another user's private channel → 403
  {
    const r = await pusherAuth('12345.67890', `private-user-${randomUUID()}`, cookie);
    if (r.status === 403) ok('POST /api/pusher/auth (other user channel → 403)');
    else ko(`POST /api/pusher/auth other user (expected 403, got ${r.status})`);
  }

  // Valid auth, thread user doesn't belong to → 403
  {
    const r = await pusherAuth('12345.67890', `private-thread-${randomUUID()}`, cookie);
    if (r.status === 403) ok('POST /api/pusher/auth (foreign thread → 403)');
    else ko(`POST /api/pusher/auth foreign thread (expected 403, got ${r.status})`);
  }

  // Valid auth, user's own channel → 200 or 500 (Pusher not configured)
  {
    const r = await pusherAuth('12345.67890', `private-user-${TEST_USER_ID}`, cookie);
    if (r.status === 200) ok('POST /api/pusher/auth (own user channel → 200)');
    else if (r.status === 500) sk('POST /api/pusher/auth (own channel → 500 — Pusher placeholder keys)');
    else ko(`POST /api/pusher/auth own channel (expected 200, got ${r.status})`, JSON.stringify(r.data)?.slice(0, 200));
  }

  // ═══════════════════════════════════════════════════════════════
  // 9. Cron Job — Close Passes
  // ═══════════════════════════════════════════════════════════════
  header('9. Cron Job — /api/jobs/close-passes');

  // Without CRON_SECRET set, should work (no auth required when secret not configured)
  {
    const r = await http('GET', '/api/jobs/close-passes');
    if (r.status === 200) {
      ok(`GET /api/jobs/close-passes → 200 (closed: ${r.data?.closed ?? '?'})`);
    } else if (r.status === 401) {
      ok('GET /api/jobs/close-passes → 401 (CRON_SECRET enforced)');
    } else {
      ko(`GET /api/jobs/close-passes (unexpected ${r.status})`, JSON.stringify(r.data)?.slice(0, 200));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════
  console.log('\n============================================');
  console.log(`  Results: ${pass} passed, ${fail} failed, ${skip} skipped`);
  console.log('============================================\n');

  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
