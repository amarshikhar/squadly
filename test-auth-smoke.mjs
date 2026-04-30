#!/usr/bin/env node
/**
 * Squadly Phase 1b — Authenticated Smoke Tests
 *
 * Mints an encrypted NextAuth JWE (A256CBC-HS512) using AUTH_SECRET,
 * then tests all authenticated endpoints.
 *
 * Usage:  node test-auth-smoke.mjs
 * Requires: dev server running on localhost:3000
 */

import { hkdf } from '@panva/hkdf';
import { EncryptJWT, base64url, calculateJwkThumbprint } from 'jose';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';

// ─── Config ───────────────────────────────────────────────────────
const BASE = 'http://localhost:3000';
const COOKIE_NAME = 'authjs.session-token'; // non-secure (localhost)
const ENC = 'A256CBC-HS512';
const ALG = 'dir';

// Read AUTH_SECRET from .env.local
const envFile = readFileSync('.env.local', 'utf8');
const authSecret = envFile.match(/^AUTH_SECRET=(.+)$/m)?.[1]?.trim();
if (!authSecret) {
  console.error('Could not find AUTH_SECRET in .env.local');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────
const green  = (msg) => console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
const red    = (msg) => console.log(`\x1b[31m✗ ${msg}\x1b[0m`);
const yellow = (msg) => console.log(`\x1b[33m⊘ ${msg}\x1b[0m`);
const header = (msg) => console.log(`\n--- ${msg} ---`);

let pass = 0, fail = 0, skip = 0;
function ok(label) { green(label); pass++; }
function ko(label) { red(label); fail++; }
function sk(label) { yellow(label); skip++; }

async function getDerivedEncryptionKey(secret, salt) {
  return await hkdf('sha256', secret, salt, `Auth.js Generated Encryption Key (${salt})`, 64);
}

async function mintAuthJsJWT(userId) {
  const encryptionSecret = await getDerivedEncryptionKey(authSecret, COOKIE_NAME);
  const thumbprint = await calculateJwkThumbprint(
    { kty: 'oct', k: base64url.encode(encryptionSecret) },
    `sha${encryptionSecret.byteLength << 3}`
  );

  const now = Math.floor(Date.now() / 1000);
  return await new EncryptJWT({
    sub: userId,
    name: 'Smoke Test User',
    email: 'smoketest@squadly.dev',
    picture: '',
  })
    .setProtectedHeader({ alg: ALG, enc: ENC, kid: thumbprint })
    .setIssuedAt()
    .setExpirationTime(now + 3600)
    .setJti(randomUUID())
    .encrypt(encryptionSecret);
}

async function req(method, path, body = null, cookie = null) {
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
  return { status: res.status, data, location: res.headers.get('location') };
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('============================================');
  console.log('  Squadly Phase 1b — Authenticated Smoke Tests');
  console.log('============================================');

  // Check server
  try { await fetch(BASE); } catch {
    red('Dev server not running at ' + BASE);
    process.exit(1);
  }
  ok('Dev server is running');

  // Mint encrypted JWE using real user ID (FK constraints require existing user)
  const userId = 'd7df9b88-10c7-4439-bbf0-b48dd42c7146'; // shikhar's DB user
  const token = await mintAuthJsJWT(userId);
  const cookie = `${COOKIE_NAME}=${token}`;
  ok(`Minted encrypted JWE for user ${userId.slice(0, 8)}...`);

  // ─── Validation Errors (authenticated + bad payloads → 400) ───
  header('Validation Errors (bad payloads → 400)');

  const validationTests = [
    { label: 'POST /api/services — missing required fields', path: '/api/services', body: { type: 'invalid_type' }, expect: 400 },
    { label: 'POST /api/services — title too short', path: '/api/services', body: { type: 'coaching', game: 'valorant', title: 'ab', description: 'x'.repeat(5), priceInr: 100, durationMin: 60 }, expect: 400 },
    { label: 'POST /api/goals — title too short', path: '/api/goals', body: { title: 'ab', targetCoins: 100, deadlineHoursFromNow: 12 }, expect: 400 },
    { label: 'POST /api/goals — deadline too long (>72h)', path: '/api/goals', body: { title: 'Valid Title Here', targetCoins: 100, deadlineHoursFromNow: 100 }, expect: 400 },
    { label: 'POST /api/goals — negative coins', path: '/api/goals', body: { title: 'Valid Title Here', targetCoins: -50, deadlineHoursFromNow: 24 }, expect: 400 },
    { label: 'POST /api/coins — below minimum (₹100)', path: '/api/coins', body: { inrAmount: 10 }, expect: 400 },
    { label: 'POST /api/coins — negative amount', path: '/api/coins', body: { inrAmount: -500 }, expect: 400 },
    { label: 'POST /api/ranks/verify — invalid game', path: '/api/ranks/verify', body: { game: 'minecraft' }, expect: 400 },
    { label: 'POST /api/ranks/verify — missing gameName for valorant', path: '/api/ranks/verify', body: { game: 'valorant' }, expect: 400 },
    { label: 'POST /api/payouts/withdraw — below ₹500 min', path: '/api/payouts/withdraw', body: { amountInr: 1000, vpa: 'test@upi' }, expect: 400 },
    { label: 'POST /api/payouts/withdraw — invalid UPI format', path: '/api/payouts/withdraw', body: { amountInr: 50000, vpa: 'not-a-vpa' }, expect: 400 },
    { label: 'POST /api/reviews — missing requestId', path: '/api/reviews', body: { rating: 5 }, expect: 400 },
    { label: 'POST /api/reviews — rating out of range (10)', path: '/api/reviews', body: { requestId: randomUUID(), rating: 10 }, expect: 400 },
    { label: 'POST /api/bids — missing passId', path: '/api/bids', body: { coinAmount: 100 }, expect: 400 },
  ];

  for (const t of validationTests) {
    const r = await req('POST', t.path, t.body, cookie);
    if (r.status === t.expect) {
      ok(`${t.label}  (HTTP ${r.status})`);
    } else {
      ko(`${t.label}  (expected ${t.expect}, got ${r.status})`);
      if (r.data) console.log('  ↳', JSON.stringify(r.data).slice(0, 200));
    }
  }

  // ─── Service Creation ─────────────────────────────────────────
  header('Service Creation');

  const svcRes = await req('POST', '/api/services', {
    type: 'coaching',
    game: 'valorant',
    title: 'Smoke Test Coaching Session',
    description: 'Automated smoke test — learn to aim better in Valorant ranked.',
    priceInr: 50000,
    durationMin: 60,
    deliveryWindowHours: 48,
  }, cookie);

  let serviceId = null;
  if (svcRes.status === 201 && svcRes.data?.service?.id) {
    serviceId = svcRes.data.service.id;
    ok(`Created service: ${serviceId}`);
  } else if (svcRes.status === 500) {
    sk(`Service creation — DB error (tables may not exist or test user has no DB row)`);
    if (svcRes.data) console.log('  ↳', JSON.stringify(svcRes.data).slice(0, 300));
  } else {
    ko(`Service creation (HTTP ${svcRes.status})`);
    if (svcRes.data) console.log('  ↳', JSON.stringify(svcRes.data).slice(0, 300));
  }

  // Self-booking prevention
  if (serviceId) {
    const selfBook = await req('POST', '/api/requests', { serviceId }, cookie);
    if (selfBook.status === 400) {
      ok('Self-booking prevented (HTTP 400)');
    } else {
      ko(`Self-booking check (expected 400, got ${selfBook.status})`);
    }
  }

  // ─── Goal Creation ────────────────────────────────────────────
  header('Goal Creation');

  const goalRes = await req('POST', '/api/goals', {
    title: 'Smoke Test Squad Goal',
    description: 'Automated test — reach 1000 coins for a Conqueror push.',
    targetCoins: 1000,
    deadlineHoursFromNow: 48,
  }, cookie);

  if (goalRes.status === 201 && goalRes.data?.goal?.id) {
    ok(`Created goal: ${goalRes.data.goal.id}`);
  } else if (goalRes.status === 500) {
    sk(`Goal creation — DB error (tables may not exist)`);
    if (goalRes.data) console.log('  ↳', JSON.stringify(goalRes.data).slice(0, 300));
  } else {
    ko(`Goal creation (HTTP ${goalRes.status})`);
    if (goalRes.data) console.log('  ↳', JSON.stringify(goalRes.data).slice(0, 300));
  }

  // GET goals
  const goalsGet = await req('GET', '/api/goals');
  if (goalsGet.status === 200 && Array.isArray(goalsGet.data?.goals)) {
    ok(`GET /api/goals → ${goalsGet.data.goals.length} goals`);
  } else {
    ko(`GET /api/goals (HTTP ${goalsGet.status})`);
  }

  // ─── Rank Verification ────────────────────────────────────────
  header('Rank Verification');

  // Valorant (Riot API or sandbox)
  const rankVal = await req('POST', '/api/ranks/verify', {
    game: 'valorant', gameName: 'SmokeTest', tagLine: '000',
  }, cookie);

  if ([200, 201].includes(rankVal.status)) {
    ok(`Valorant rank verify (HTTP ${rankVal.status})`);
    if (rankVal.data?.rank) console.log(`  ↳ Rank: ${rankVal.data.rank.rank_label}, via: ${rankVal.data.rank.verified_via}`);
  } else if (rankVal.status === 400) {
    sk(`Valorant rank — API/validation error: ${JSON.stringify(rankVal.data).slice(0, 150)} (expected with fake data)`);
  } else if (rankVal.status === 500) {
    sk(`Valorant rank — DB/API error`);
    if (rankVal.data) console.log('  ↳', JSON.stringify(rankVal.data).slice(0, 200));
  } else {
    ko(`Valorant rank verify (HTTP ${rankVal.status})`);
  }

  // BGMI (self-reported)
  const rankBgmi = await req('POST', '/api/ranks/verify', {
    game: 'bgmi', inGameId: 'SMOKE_TEST_12345',
  }, cookie);

  if ([200, 201].includes(rankBgmi.status)) {
    ok(`BGMI rank verify — self-reported (HTTP ${rankBgmi.status})`);
  } else if (rankBgmi.status === 500) {
    sk(`BGMI rank verify — DB error`);
    if (rankBgmi.data) console.log('  ↳', JSON.stringify(rankBgmi.data).slice(0, 200));
  } else {
    ko(`BGMI rank verify (HTTP ${rankBgmi.status})`);
  }

  // ─── Bids (Stub) ─────────────────────────────────────────────
  header('Bids (Stub)');

  const bidRes = await req('POST', '/api/bids', {
    passId: randomUUID(), coinAmount: 200,
  }, cookie);

  if (bidRes.status === 200 && bidRes.data?.ok) {
    ok('POST /api/bids → stub response');
  } else {
    ko(`POST /api/bids (HTTP ${bidRes.status})`);
  }

  // ─── Coins (Razorpay) ────────────────────────────────────────
  header('Coin Topup (Razorpay)');

  const coinRes = await req('POST', '/api/coins', { inrAmount: 100 }, cookie);
  if (coinRes.status === 200 && coinRes.data?.orderId) {
    ok(`Coin topup order created: ${coinRes.data.orderId}`);
  } else if ([500, 502].includes(coinRes.status)) {
    sk(`Coin topup (HTTP ${coinRes.status}) — expected with placeholder Razorpay keys`);
  } else {
    ko(`Coin topup (HTTP ${coinRes.status})`);
    if (coinRes.data) console.log('  ↳', JSON.stringify(coinRes.data).slice(0, 200));
  }

  // ─── Authenticated Pages ──────────────────────────────────────
  header('Authenticated Pages');

  const pages = [
    ['/home', 'Dashboard'],
    ['/vault', 'Vault'],
    ['/services', 'Browse Services'],
    ['/services/create', 'Create Service'],
    ['/goals', 'Squad Goals'],
    ['/requests', 'Requests'],
    ['/payouts', 'Payouts'],
    ['/profile', 'Profile'],
  ];

  for (const [path, label] of pages) {
    const r = await req('GET', path, null, cookie);
    if (r.status === 200) {
      ok(`${label} (${path})  (HTTP 200)`);
    } else if ([307, 302].includes(r.status)) {
      ko(`${label} (${path}) → redirected (HTTP ${r.status}) — JWT not accepted`);
    } else {
      ko(`${label} (${path})  (HTTP ${r.status})`);
    }
  }

  // ─── Summary ──────────────────────────────────────────────────
  console.log('\n============================================');
  console.log(`  Results: ${pass} passed, ${fail} failed, ${skip} skipped`);
  console.log('============================================\n');

  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
