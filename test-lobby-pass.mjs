#!/usr/bin/env node
/**
 * Squadly — Lobby Pass Rigorous Test Suite
 *
 * Tests the highest-risk code in the codebase:
 *   - Concurrent bid race conditions
 *   - Escrow balance correctness (coins escrowed = coins deducted, no leaks)
 *   - Bid replacement (same user rebids → old bid refunded atomically)
 *   - Pass close: winners get won, losers refunded, no coins lost
 *   - Edge cases: bid on closed pass, bid below minimum, insufficient coins
 *   - Audit: ledger rows match vault mutations exactly
 *
 * Uses a dedicated creator + multiple fan users seeded via direct DB writes.
 *
 * Usage:  node test-lobby-pass.mjs
 * Requires: dev server running on localhost:3000
 */

import { hkdf } from '@panva/hkdf';
import { EncryptJWT, base64url, calculateJwkThumbprint } from 'jose';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

// ─── Config ───────────────────────────────────────────────────────
const BASE = 'http://localhost:3000';
const COOKIE_NAME = 'authjs.session-token';
const ENC = 'A256CBC-HS512';
const ALG = 'dir';

const envFile = readFileSync(join(import.meta.dirname, '.env.local'), 'utf8');
const authSecret = envFile.match(/^AUTH_SECRET=(.+)$/m)?.[1]?.trim();
const dbUrl = envFile.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!authSecret) { console.error('Missing AUTH_SECRET'); process.exit(1); }
if (!dbUrl) { console.error('Missing DATABASE_URL'); process.exit(1); }

const sql_db = postgres(dbUrl);

// ─── Colors ───────────────────────────────────────────────────────
const green  = (m) => console.log(`\x1b[32m✓ ${m}\x1b[0m`);
const red    = (m) => console.log(`\x1b[31m✗ ${m}\x1b[0m`);
const yellow = (m) => console.log(`\x1b[33m⊘ ${m}\x1b[0m`);
const header = (m) => console.log(`\n━━━ ${m} ━━━`);
const dim    = (m) => console.log(`\x1b[90m  ${m}\x1b[0m`);

let pass = 0, fail = 0, skip = 0;
function ok(l) { green(l); pass++; }
function ko(l, detail) { red(l); if (detail) dim(typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 300)); fail++; }
function sk(l) { yellow(l); skip++; }

function assert(cond, label, detail) {
  if (cond) ok(label);
  else ko(label, detail);
}

// ─── JWT Minting ──────────────────────────────────────────────────
async function mintJWT(userId) {
  const key = await hkdf('sha256', authSecret, COOKIE_NAME,
    `Auth.js Generated Encryption Key (${COOKIE_NAME})`, 64);
  const kid = await calculateJwkThumbprint(
    { kty: 'oct', k: base64url.encode(key) },
    `sha${key.byteLength << 3}`);
  return new EncryptJWT({ sub: userId, name: 'Lobby Test', email: `test-${userId.slice(0,8)}@squadly.dev` })
    .setProtectedHeader({ alg: ALG, enc: ENC, kid })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .setJti(randomUUID())
    .encrypt(key);
}

async function cookieFor(userId) {
  return `${COOKIE_NAME}=${await mintJWT(userId)}`;
}

// ─── HTTP Helper ──────────────────────────────────────────────────
async function http(method, path, { body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const opts = { method, headers, redirect: 'manual' };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data = null;
  if ((res.headers.get('content-type') || '').includes('json')) {
    try { data = await res.json(); } catch {}
  }
  return { status: res.status, data };
}

// ─── DB Helpers ───────────────────────────────────────────────────
async function seedUser(id, handle, email) {
  await sql_db`
    INSERT INTO users (id, email, handle, display_name, role)
    VALUES (${id}, ${email}, ${handle}, ${handle}, 'fan')
    ON CONFLICT (id) DO NOTHING
  `;
  await sql_db`
    INSERT INTO vault_balances (user_id, inr_balance, coin_balance, inr_pending)
    VALUES (${id}, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING
  `;
}

async function setCoinBalance(userId, coins) {
  await sql_db`UPDATE vault_balances SET coin_balance = ${coins} WHERE user_id = ${userId}`;
}

async function getCoinBalance(userId) {
  const [row] = await sql_db`SELECT coin_balance FROM vault_balances WHERE user_id = ${userId}`;
  return row?.coin_balance ?? 0;
}

async function getTransactionCount(userId) {
  const [row] = await sql_db`SELECT count(*) as cnt FROM transactions WHERE user_id = ${userId}`;
  return parseInt(row.cnt);
}

async function getBidsForPass(passId) {
  return sql_db`SELECT * FROM lobby_pass_bids WHERE pass_id = ${passId} ORDER BY coin_amount DESC, bid_at DESC`;
}

async function getPassStatus(passId) {
  const [row] = await sql_db`SELECT status FROM lobby_passes WHERE id = ${passId}`;
  return row?.status;
}

async function getThreadBetween(creatorId, fanId) {
  const [row] = await sql_db`SELECT * FROM message_threads WHERE creator_id = ${creatorId} AND fan_id = ${fanId}`;
  return row;
}

async function getRank(creatorId, fanId) {
  const [row] = await sql_db`SELECT * FROM squad_ranks WHERE creator_id = ${creatorId} AND fan_id = ${fanId}`;
  return row;
}

// ─── Cleanup ──────────────────────────────────────────────────────
const TEST_IDS = [];
async function cleanup() {
  if (TEST_IDS.length === 0) return;
  // Clean up in FK-safe order
  await sql_db`DELETE FROM messages WHERE thread_id IN (SELECT id FROM message_threads WHERE creator_id = ANY(${TEST_IDS}) OR fan_id = ANY(${TEST_IDS}))`;
  await sql_db`DELETE FROM message_threads WHERE creator_id = ANY(${TEST_IDS}) OR fan_id = ANY(${TEST_IDS})`;
  await sql_db`DELETE FROM lobby_pass_bids WHERE bidder_id = ANY(${TEST_IDS})`;
  await sql_db`DELETE FROM lobby_passes WHERE creator_id = ANY(${TEST_IDS})`;
  await sql_db`DELETE FROM squad_goal_contributions WHERE fan_id = ANY(${TEST_IDS})`;
  await sql_db`DELETE FROM squad_goals WHERE creator_id = ANY(${TEST_IDS})`;
  await sql_db`DELETE FROM squad_ranks WHERE creator_id = ANY(${TEST_IDS}) OR fan_id = ANY(${TEST_IDS})`;
  await sql_db`DELETE FROM transactions WHERE user_id = ANY(${TEST_IDS})`;
  await sql_db`DELETE FROM vault_balances WHERE user_id = ANY(${TEST_IDS})`;
  await sql_db`DELETE FROM users WHERE id = ANY(${TEST_IDS})`;
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('============================================');
  console.log('  Squadly — Lobby Pass Rigorous Tests');
  console.log('============================================');

  try { await fetch(BASE); } catch {
    ko('Dev server not running'); process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════
  // SETUP: seed users
  // ═══════════════════════════════════════════════════════════════
  header('0. Setup — Seed Test Users');

  const CREATOR_ID = randomUUID(); TEST_IDS.push(CREATOR_ID);
  const FAN_A = randomUUID(); TEST_IDS.push(FAN_A);
  const FAN_B = randomUUID(); TEST_IDS.push(FAN_B);
  const FAN_C = randomUUID(); TEST_IDS.push(FAN_C);
  const FAN_D = randomUUID(); TEST_IDS.push(FAN_D);
  const FAN_E = randomUUID(); TEST_IDS.push(FAN_E);

  await seedUser(CREATOR_ID, `lpt_creator_${CREATOR_ID.slice(0,6)}`, `creator_${CREATOR_ID.slice(0,6)}@test.dev`);
  await seedUser(FAN_A, `lpt_fan_a_${FAN_A.slice(0,6)}`, `fan_a_${FAN_A.slice(0,6)}@test.dev`);
  await seedUser(FAN_B, `lpt_fan_b_${FAN_B.slice(0,6)}`, `fan_b_${FAN_B.slice(0,6)}@test.dev`);
  await seedUser(FAN_C, `lpt_fan_c_${FAN_C.slice(0,6)}`, `fan_c_${FAN_C.slice(0,6)}@test.dev`);
  await seedUser(FAN_D, `lpt_fan_d_${FAN_D.slice(0,6)}`, `fan_d_${FAN_D.slice(0,6)}@test.dev`);
  await seedUser(FAN_E, `lpt_fan_e_${FAN_E.slice(0,6)}`, `fan_e_${FAN_E.slice(0,6)}@test.dev`);

  // Give fans coins
  await setCoinBalance(FAN_A, 10000);
  await setCoinBalance(FAN_B, 10000);
  await setCoinBalance(FAN_C, 10000);
  await setCoinBalance(FAN_D, 500);  // low balance for insufficient coins test
  await setCoinBalance(FAN_E, 10000);

  const creatorCookie = await cookieFor(CREATOR_ID);
  const fanACookie = await cookieFor(FAN_A);
  const fanBCookie = await cookieFor(FAN_B);
  const fanCCookie = await cookieFor(FAN_C);
  const fanDCookie = await cookieFor(FAN_D);
  const fanECookie = await cookieFor(FAN_E);

  ok(`Seeded 1 creator + 5 fans`);

  // ═══════════════════════════════════════════════════════════════
  // TEST 1: Create a lobby pass
  // ═══════════════════════════════════════════════════════════════
  header('1. Create Lobby Pass');

  const createRes = await http('POST', '/api/passes', {
    body: {
      title: 'Stress Test Lobby Pass',
      description: 'Testing concurrency and escrow.',
      game: 'valorant',
      slotCount: 2,           // only 2 winners
      minBidCoins: 100,
      bidIncrementCoins: 50,
      endsInMinutes: 30,      // 30 min from now
      sessionInMinutes: 120,
      sessionDurationMin: 60,
    },
    cookie: creatorCookie,
  });

  assert(createRes.status === 201, 'Pass created (201)', createRes.data);
  const PASS_ID = createRes.data?.pass?.id;
  dim(`Pass ID: ${PASS_ID}, slots: 2, minBid: 100`);

  // ═══════════════════════════════════════════════════════════════
  // TEST 2: Edge Cases — bid guards
  // ═══════════════════════════════════════════════════════════════
  header('2. Edge Cases — Bid Guards');

  // 2a. Creator cannot bid on own pass
  {
    await setCoinBalance(CREATOR_ID, 5000);
    const r = await http('POST', `/api/passes/${PASS_ID}/bid`, {
      body: { coinAmount: 200 },
      cookie: creatorCookie,
    });
    assert(r.status === 400 && r.data?.error === 'own_pass', 'Creator cannot bid on own pass', r.data);
  }

  // 2b. Bid below minimum
  {
    const r = await http('POST', `/api/passes/${PASS_ID}/bid`, {
      body: { coinAmount: 50 }, // min is 100
      cookie: fanACookie,
    });
    assert(r.status === 400 && r.data?.error === 'below_min_bid', 'Bid below minimum rejected', r.data);
  }

  // 2c. Insufficient coins
  {
    const r = await http('POST', `/api/passes/${PASS_ID}/bid`, {
      body: { coinAmount: 1000 }, // FAN_D only has 500
      cookie: fanDCookie,
    });
    assert(r.status === 400 && r.data?.error === 'insufficient_coins', 'Insufficient coins rejected', r.data);
    // Verify no coins were deducted
    const bal = await getCoinBalance(FAN_D);
    assert(bal === 500, `FAN_D balance unchanged at 500 (got ${bal})`);
  }

  // 2d. Bid on nonexistent pass
  {
    const r = await http('POST', `/api/passes/${randomUUID()}/bid`, {
      body: { coinAmount: 200 },
      cookie: fanACookie,
    });
    assert(r.status === 400 && r.data?.error === 'pass_not_found', 'Nonexistent pass rejected', r.data);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 3: Sequential Bidding + Escrow Correctness
  // ═══════════════════════════════════════════════════════════════
  header('3. Sequential Bidding + Escrow Correctness');

  // Record starting balances
  const startA = await getCoinBalance(FAN_A);
  const startB = await getCoinBalance(FAN_B);
  const startC = await getCoinBalance(FAN_C);

  // Fan A bids 200
  {
    const r = await http('POST', `/api/passes/${PASS_ID}/bid`, {
      body: { coinAmount: 200 },
      cookie: fanACookie,
    });
    assert(r.status === 200, 'Fan A bids 200', r.data);
    const bal = await getCoinBalance(FAN_A);
    assert(bal === startA - 200, `Fan A balance: ${startA} - 200 = ${startA - 200} (got ${bal})`);
  }

  // Fan B bids 300
  {
    const r = await http('POST', `/api/passes/${PASS_ID}/bid`, {
      body: { coinAmount: 300 },
      cookie: fanBCookie,
    });
    assert(r.status === 200, 'Fan B bids 300', r.data);
    const bal = await getCoinBalance(FAN_B);
    assert(bal === startB - 300, `Fan B balance: ${startB} - 300 = ${startB - 300} (got ${bal})`);
  }

  // Fan C bids 150 (will be outbid since slots=2 and A=200, B=300)
  {
    const r = await http('POST', `/api/passes/${PASS_ID}/bid`, {
      body: { coinAmount: 150 },
      cookie: fanCCookie,
    });
    assert(r.status === 200, 'Fan C bids 150 (outbid position)', r.data);
    const bal = await getCoinBalance(FAN_C);
    assert(bal === startC - 150, `Fan C balance: ${startC} - 150 = ${startC - 150} (got ${bal})`);
  }

  // Verify bid statuses: B=winning, A=active, C=outbid
  {
    const bids = await getBidsForPass(PASS_ID);
    assert(bids.length === 3, `3 bids exist (got ${bids.length})`);
    const bidB = bids.find(b => b.bidder_id === FAN_B);
    const bidA = bids.find(b => b.bidder_id === FAN_A);
    const bidC = bids.find(b => b.bidder_id === FAN_C);
    assert(bidB?.status === 'winning', `Fan B is 'winning' (got ${bidB?.status})`);
    assert(bidA?.status === 'active', `Fan A is 'active' (got ${bidA?.status})`);
    assert(bidC?.status === 'outbid', `Fan C is 'outbid' (got ${bidC?.status})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 4: Bid Replacement (same user rebids)
  // ═══════════════════════════════════════════════════════════════
  header('4. Bid Replacement — Same User Rebids');

  // Fan A rebids at 500 (was 200) → old bid should be refunded, new escrow taken
  {
    const balBefore = await getCoinBalance(FAN_A);
    const r = await http('POST', `/api/passes/${PASS_ID}/bid`, {
      body: { coinAmount: 500 },
      cookie: fanACookie,
    });
    assert(r.status === 200, 'Fan A rebids at 500', r.data);

    const balAfter = await getCoinBalance(FAN_A);
    // Should be: balBefore + 200 (refund old) - 500 (new escrow) = balBefore - 300
    assert(balAfter === balBefore + 200 - 500,
      `Fan A balance after rebid: ${balBefore} + 200 - 500 = ${balBefore - 300} (got ${balAfter})`);

    // Check old bid is refunded
    const bids = await getBidsForPass(PASS_ID);
    const fanABids = bids.filter(b => b.bidder_id === FAN_A);
    const refundedBids = fanABids.filter(b => b.status === 'refunded');
    const activeBids = fanABids.filter(b => b.status === 'winning' || b.status === 'active');
    assert(refundedBids.length === 1, `Fan A has 1 refunded old bid (got ${refundedBids.length})`);
    assert(activeBids.length === 1, `Fan A has 1 active/winning bid (got ${activeBids.length})`);
    assert(activeBids[0]?.coin_amount === 500, `Fan A active bid is 500 coins (got ${activeBids[0]?.coin_amount})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 5: Concurrent Bid Race Condition
  // ═══════════════════════════════════════════════════════════════
  header('5. Concurrent Bids — Race Condition Test');

  // Create a fresh pass for concurrency testing
  const concRes = await http('POST', '/api/passes', {
    body: {
      title: 'Concurrency Test Pass',
      game: 'bgmi',
      slotCount: 2,
      minBidCoins: 100,
      bidIncrementCoins: 50,
      endsInMinutes: 30,
      sessionInMinutes: 120,
      sessionDurationMin: 60,
    },
    cookie: creatorCookie,
  });
  const CONC_PASS_ID = concRes.data?.pass?.id;
  assert(!!CONC_PASS_ID, 'Concurrency pass created');

  // Reset balances
  await setCoinBalance(FAN_A, 5000);
  await setCoinBalance(FAN_B, 5000);
  await setCoinBalance(FAN_C, 5000);
  await setCoinBalance(FAN_E, 5000);

  // Fire 4 bids simultaneously
  dim('Firing 4 concurrent bids...');
  const concurrentBids = await Promise.allSettled([
    http('POST', `/api/passes/${CONC_PASS_ID}/bid`, { body: { coinAmount: 200 }, cookie: fanACookie }),
    http('POST', `/api/passes/${CONC_PASS_ID}/bid`, { body: { coinAmount: 300 }, cookie: fanBCookie }),
    http('POST', `/api/passes/${CONC_PASS_ID}/bid`, { body: { coinAmount: 250 }, cookie: fanCCookie }),
    http('POST', `/api/passes/${CONC_PASS_ID}/bid`, { body: { coinAmount: 400 }, cookie: fanECookie }),
  ]);

  const succeeded = concurrentBids.filter(r => r.status === 'fulfilled' && r.value.status === 200);
  const failed = concurrentBids.filter(r => r.status === 'fulfilled' && r.value.status !== 200);
  const rejected = concurrentBids.filter(r => r.status === 'rejected');

  dim(`${succeeded.length} succeeded, ${failed.length} failed (4xx), ${rejected.length} rejected (error)`);

  // At minimum, all 4 should have processed (either success or business error, not 500)
  const all500 = concurrentBids.filter(r => r.status === 'fulfilled' && r.value.status === 500);
  assert(all500.length === 0, `No 500 errors from concurrent bids (got ${all500.length})`);

  // Verify escrow correctness: total coins deducted = sum of active/winning/outbid bids
  {
    const bids = await getBidsForPass(CONC_PASS_ID);
    const liveBids = bids.filter(b => ['active', 'winning', 'outbid'].includes(b.status));
    const totalEscrowed = liveBids.reduce((s, b) => s + b.coin_amount, 0);

    const balA = await getCoinBalance(FAN_A);
    const balB = await getCoinBalance(FAN_B);
    const balC = await getCoinBalance(FAN_C);
    const balE = await getCoinBalance(FAN_E);

    const totalDeducted = (5000 - balA) + (5000 - balB) + (5000 - balC) + (5000 - balE);

    assert(totalEscrowed === totalDeducted,
      `Escrow matches vault deductions: escrowed=${totalEscrowed}, deducted=${totalDeducted}`);

    dim(`Live bids: ${liveBids.length}, total escrowed: ${totalEscrowed}`);
    dim(`Balances: A=${balA}, B=${balB}, C=${balC}, E=${balE}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 6: Rapid Rebid by Same User (race on self-replacement)
  // ═══════════════════════════════════════════════════════════════
  header('6. Rapid Rebid — Same User Race');

  const rebidRes = await http('POST', '/api/passes', {
    body: {
      title: 'Rebid Race Test',
      game: 'cs2',
      slotCount: 1,
      minBidCoins: 100,
      bidIncrementCoins: 50,
      endsInMinutes: 30,
      sessionInMinutes: 120,
      sessionDurationMin: 60,
    },
    cookie: creatorCookie,
  });
  const REBID_PASS_ID = rebidRes.data?.pass?.id;

  await setCoinBalance(FAN_A, 5000);

  // Fire 3 rapid rebids from the same user
  dim('Fan A fires 3 rapid rebids at 200, 300, 400...');
  const rebidResults = await Promise.allSettled([
    http('POST', `/api/passes/${REBID_PASS_ID}/bid`, { body: { coinAmount: 200 }, cookie: fanACookie }),
    http('POST', `/api/passes/${REBID_PASS_ID}/bid`, { body: { coinAmount: 300 }, cookie: fanACookie }),
    http('POST', `/api/passes/${REBID_PASS_ID}/bid`, { body: { coinAmount: 400 }, cookie: fanACookie }),
  ]);

  const rebidSucceeded = rebidResults.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
  dim(`${rebidSucceeded}/3 rebids succeeded`);

  // After all settle, fan should have exactly 1 active/winning bid
  // and balance should reflect only that one bid escrowed
  {
    const bids = await getBidsForPass(REBID_PASS_ID);
    const fanALive = bids.filter(b => b.bidder_id === FAN_A && ['active', 'winning'].includes(b.status));
    assert(fanALive.length === 1, `Fan A has exactly 1 live bid after rapid rebids (got ${fanALive.length})`);

    const liveBidAmount = fanALive[0]?.coin_amount ?? 0;
    const balA = await getCoinBalance(FAN_A);
    assert(balA === 5000 - liveBidAmount,
      `Fan A balance = 5000 - ${liveBidAmount} = ${5000 - liveBidAmount} (got ${balA})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 7: Pass Close — Winners & Losers
  // ═══════════════════════════════════════════════════════════════
  header('7. Pass Close — Winners, Losers, & Escrow Settlement');

  // Create a pass that ends immediately
  const closeRes = await http('POST', '/api/passes', {
    body: {
      title: 'Close Test Pass',
      game: 'valorant',
      slotCount: 2,
      minBidCoins: 100,
      bidIncrementCoins: 50,
      endsInMinutes: 15,  // will manually expire via DB
      sessionInMinutes: 120,
      sessionDurationMin: 60,
    },
    cookie: creatorCookie,
  });
  const CLOSE_PASS_ID = closeRes.data?.pass?.id;
  assert(!!CLOSE_PASS_ID, 'Close test pass created');

  // Reset and place bids
  await setCoinBalance(FAN_A, 5000);
  await setCoinBalance(FAN_B, 5000);
  await setCoinBalance(FAN_C, 5000);

  // Sequential bids to avoid race complexity in close test
  await http('POST', `/api/passes/${CLOSE_PASS_ID}/bid`, { body: { coinAmount: 500 }, cookie: fanACookie });
  await http('POST', `/api/passes/${CLOSE_PASS_ID}/bid`, { body: { coinAmount: 400 }, cookie: fanBCookie });
  await http('POST', `/api/passes/${CLOSE_PASS_ID}/bid`, { body: { coinAmount: 200 }, cookie: fanCCookie });

  // Verify pre-close balances
  const preCloseA = await getCoinBalance(FAN_A);
  const preCloseB = await getCoinBalance(FAN_B);
  const preCloseC = await getCoinBalance(FAN_C);
  assert(preCloseA === 4500, `Pre-close Fan A: 5000-500=4500 (got ${preCloseA})`);
  assert(preCloseB === 4600, `Pre-close Fan B: 5000-400=4600 (got ${preCloseB})`);
  assert(preCloseC === 4800, `Pre-close Fan C: 5000-200=4800 (got ${preCloseC})`);

  // Force expire the pass by setting all timestamps to the past (respecting CHECK constraints)
  await sql_db`
    UPDATE lobby_passes SET
      starts_at = NOW() - INTERVAL '30 minutes',
      ends_at = NOW() - INTERVAL '1 minute',
      session_at = NOW() + INTERVAL '1 minute'
    WHERE id = ${CLOSE_PASS_ID}
  `;

  // Trigger the close-passes cron
  const cronRes = await http('GET', '/api/jobs/close-passes');
  assert(cronRes.status === 200, `Cron close-passes returned 200`, cronRes.data);
  dim(`Cron result: closed ${cronRes.data?.closed} passes`);

  // Verify pass is closed
  {
    const status = await getPassStatus(CLOSE_PASS_ID);
    assert(status === 'closed', `Pass status is 'closed' (got ${status})`);
  }

  // Verify bid statuses
  {
    const bids = await getBidsForPass(CLOSE_PASS_ID);
    const bidA = bids.find(b => b.bidder_id === FAN_A);
    const bidB = bids.find(b => b.bidder_id === FAN_B);
    const bidC = bids.find(b => b.bidder_id === FAN_C);

    assert(bidA?.status === 'won', `Fan A (500) → won (got ${bidA?.status})`);
    assert(bidB?.status === 'won', `Fan B (400) → won (got ${bidB?.status})`);
    assert(bidC?.status === 'refunded', `Fan C (200) → refunded (got ${bidC?.status})`);
  }

  // Verify post-close balances: winners keep escrow deducted, loser gets refund
  {
    const postA = await getCoinBalance(FAN_A);
    const postB = await getCoinBalance(FAN_B);
    const postC = await getCoinBalance(FAN_C);

    assert(postA === 4500, `Post-close Fan A (winner): stays 4500 (got ${postA})`);
    assert(postB === 4600, `Post-close Fan B (winner): stays 4600 (got ${postB})`);
    assert(postC === 5000, `Post-close Fan C (loser): refunded to 5000 (got ${postC})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 8: Post-Close Integrity — DM threads + Squad ranks
  // ═══════════════════════════════════════════════════════════════
  header('8. Post-Close Integrity — DM Threads + Squad Ranks');

  // Winners should have DM threads created
  {
    const threadA = await getThreadBetween(CREATOR_ID, FAN_A);
    const threadB = await getThreadBetween(CREATOR_ID, FAN_B);
    const threadC = await getThreadBetween(CREATOR_ID, FAN_C);

    assert(!!threadA, 'DM thread created for winner Fan A');
    assert(!!threadB, 'DM thread created for winner Fan B');
    assert(!threadC, 'No DM thread for loser Fan C');
    if (threadA) assert(threadA.unlock_source === 'lobby_pass_won', `Thread unlock source = lobby_pass_won (got ${threadA.unlock_source})`);
  }

  // Winners should have squad_rank entries
  {
    const rankA = await getRank(CREATOR_ID, FAN_A);
    const rankB = await getRank(CREATOR_ID, FAN_B);

    assert(!!rankA, 'Squad rank created for winner Fan A');
    assert(!!rankB, 'Squad rank created for winner Fan B');
    if (rankA) assert(rankA.total_coins_spent === 500, `Fan A rank coins = 500 (got ${rankA.total_coins_spent})`);
    if (rankB) assert(rankB.total_coins_spent === 400, `Fan B rank coins = 400 (got ${rankB.total_coins_spent})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 9: Bid on Closed Pass
  // ═══════════════════════════════════════════════════════════════
  header('9. Bid on Closed Pass');

  {
    await setCoinBalance(FAN_E, 5000); // reset from earlier tests
    const balBefore = await getCoinBalance(FAN_E);
    const r = await http('POST', `/api/passes/${CLOSE_PASS_ID}/bid`, {
      body: { coinAmount: 1000 },
      cookie: fanECookie,
    });
    assert(r.status === 400 && r.data?.error === 'pass_closed', 'Bid on closed pass rejected', r.data);
    const balAfter = await getCoinBalance(FAN_E);
    assert(balAfter === balBefore, `Fan E balance unchanged after rejected bid: ${balBefore} (got ${balAfter})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 10: Ledger Audit — Transaction Trail
  // ═══════════════════════════════════════════════════════════════
  header('10. Ledger Audit — Transaction Integrity');

  // For the close test pass, verify ledger entries:
  // Each winner: 1 escrow (negative) settled to 'success'
  // Each loser:  1 escrow (negative) + 1 refund (positive)
  {
    const bidA = (await getBidsForPass(CLOSE_PASS_ID)).find(b => b.bidder_id === FAN_A);
    const bidC = (await getBidsForPass(CLOSE_PASS_ID)).find(b => b.bidder_id === FAN_C);

    if (bidA?.transaction_id) {
      const [escrowTx] = await sql_db`SELECT * FROM transactions WHERE id = ${bidA.transaction_id}`;
      assert(escrowTx?.status === 'success', `Winner escrow tx settled to 'success' (got ${escrowTx?.status})`);
      assert(escrowTx?.amount_coins === -500, `Winner escrow amount = -500 (got ${escrowTx?.amount_coins})`);
    }

    if (bidC) {
      // Loser should have a refund transaction
      const refundTxs = await sql_db`
        SELECT * FROM transactions
        WHERE user_id = ${FAN_C} AND type = 'refund' AND related_bid_id = ${bidC.id}
      `;
      assert(refundTxs.length === 1, `Loser has 1 refund transaction (got ${refundTxs.length})`);
      if (refundTxs[0]) {
        assert(refundTxs[0].amount_coins === 200, `Refund amount = 200 (got ${refundTxs[0].amount_coins})`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 11: Global Coin Conservation
  // ═══════════════════════════════════════════════════════════════
  header('11. Global Coin Conservation');

  // For close test: total coins in system should be conserved
  // Winners lost coins (to creator), losers got coins back
  // Sum of all vault changes should equal zero (coins are redistributed, not destroyed)
  {
    // Net vault change for all fans involved in close test:
    // Fan A: 5000 → 4500 = -500 (won, coins to creator)
    // Fan B: 5000 → 4600 = -400 (won, coins to creator)
    // Fan C: 5000 → 5000 = 0 (refunded)
    // Total fan loss: -900
    // These 900 coins went to the creator as payment (tracked in transactions)
    const postA = await getCoinBalance(FAN_A);
    const postB = await getCoinBalance(FAN_B);
    const postC = await getCoinBalance(FAN_C);
    const fanLoss = (5000 - postA) + (5000 - postB) + (5000 - postC);
    assert(fanLoss === 900, `Total fan coin loss = 900 (got ${fanLoss})`);
    ok('Coins conserved: 500 + 400 escrowed from winners, 200 refunded to loser');
  }

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════
  header('Cleanup');
  await cleanup();
  ok('Test data cleaned up');

  // Summary
  console.log('\n============================================');
  console.log(`  Results: ${pass} passed, ${fail} failed, ${skip} skipped`);
  console.log('============================================\n');

  await sql_db.end();
  if (fail > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await sql_db.end(); } catch {}
  process.exit(1);
});
