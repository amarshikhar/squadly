/**
 * Squadly — Rigorous money-flow integrity test.
 *
 * Exercises the REAL ledger in lib/ledger.ts against the live Supabase DB
 * inside a sandbox of disposable test users (cleaned up at end), and asserts
 * conservation invariants after each step.
 *
 * Run with:  pnpm tsx test-money-flow.ts
 *
 * Exit code 0 = all invariants hold. Non-zero = a money-duplication or
 * conservation bug exists in the ledger.
 */
// Run with: pnpm tsx --env-file=.env.local test-money-flow.ts
import { randomUUID } from 'crypto';
import { eq, sql, inArray, or } from 'drizzle-orm';
import {
  db,
  users,
  vaultBalances,
  transactions,
  services,
  serviceRequests,
  squadGoals,
  squadGoalContributions,
  squadRanks,
  messageThreads,
  coinPurchases,
} from '@/lib/db';
import {
  creditCoins,
  settleCompletedRequest,
  refundRequest,
  contributeToGoal,
} from '@/lib/ledger';
import { platformFee } from '@/lib/utils';

// ─── pretty ───────────────────────────────────────────────────────
const green  = (m: string) => console.log(`\x1b[32m✓\x1b[0m ${m}`);
const red    = (m: string) => console.log(`\x1b[31m✗\x1b[0m ${m}`);
const dim    = (m: string) => console.log(`\x1b[90m  ${m}\x1b[0m`);
const header = (m: string) => console.log(`\n\x1b[1m─── ${m} ───\x1b[0m`);

let passed = 0, failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { green(msg); passed++; }
  else { red(msg); if (detail !== undefined) dim(JSON.stringify(detail)); failed++; }
}

// ─── helpers ──────────────────────────────────────────────────────
const tracked: { users: string[]; goals: string[] } = { users: [], goals: [] };

async function makeUser(role: 'fan' | 'creator' = 'fan') {
  const id = randomUUID();
  await db.insert(users).values({
    id,
    email: `mfy-${id.slice(0, 8)}@test.local`,
    handle: `mfy_${id.slice(0, 8)}`,
    displayName: `Test ${id.slice(0, 4)}`,
    role,
    isProvider: role === 'creator',
  });
  await db.insert(vaultBalances).values({ userId: id, inrBalance: 0, coinBalance: 0, inrPending: 0 });
  tracked.users.push(id);
  return id;
}

async function getVault(userId: string) {
  const v = await db.query.vaultBalances.findFirst({ where: eq(vaultBalances.userId, userId) });
  return v ?? { inrBalance: 0, coinBalance: 0, inrPending: 0 };
}

async function txnSums(userId: string) {
  const rows = await db
    .select({
      coins: sql<number>`COALESCE(SUM(${transactions.amountCoins}), 0)::int`,
      inrSettled: sql<number>`COALESCE(SUM(${transactions.amountInr}) FILTER (WHERE ${transactions.status} = 'success'), 0)::int`,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId));
  return rows[0];
}

async function txnCount(userId: string, type: string) {
  const rows = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(transactions)
    .where(sql`${transactions.userId} = ${userId} AND ${transactions.type} = ${type}`);
  return rows[0].n;
}

async function makeServiceRequest(buyerId: string, creatorId: string, priceInr: number) {
  const fee = platformFee(priceInr);
  const payout = priceInr - fee;
  const [svc] = await db.insert(services).values({
    creatorId,
    type: 'coaching',
    game: 'bgmi',
    title: 'Test svc',
    description: 'test service for money flow integrity check',
    priceInr,
    durationMin: 60,
    status: 'live',
  }).returning();
  const [req] = await db.insert(serviceRequests).values({
    serviceId: svc.id,
    creatorId,
    buyerId,
    status: 'pending',
    priceInrPaid: priceInr,
    platformFeeInr: fee,
    creatorPayoutInr: payout,
  }).returning();
  return { req, svc, fee, payout };
}

// ─── tests ────────────────────────────────────────────────────────
async function testCoinPurchaseConservation() {
  header('1. Coin purchase: balance ≡ ledger sum');
  const fan = await makeUser('fan');
  const before = await getVault(fan);
  await creditCoins({ userId: fan, coins: 500, inrPaid: 50000, gatewayRef: `mfy_${randomUUID()}`, gateway: 'razorpay' });
  const after = await getVault(fan);
  const sums = await txnSums(fan);

  assert(after.coinBalance - before.coinBalance === 500, 'coin balance increased by exactly 500');
  assert(sums.coins === 500, 'ledger sum equals coin delta', sums);
  assert(after.inrBalance === before.inrBalance, 'INR balance unchanged on coin purchase');
}

async function testCoinPurchaseIdempotency() {
  header('2. Coin purchase idempotency: replayed webhook MUST NOT double-credit');
  const fan = await makeUser('fan');
  const ref = `mfy_${randomUUID()}`;
  await creditCoins({ userId: fan, coins: 1000, inrPaid: 100000, gatewayRef: ref, gateway: 'razorpay' });
  // Replay: simulate a Razorpay re-delivery of the SAME webhook.
  let threw = false;
  try {
    await creditCoins({ userId: fan, coins: 1000, inrPaid: 100000, gatewayRef: ref, gateway: 'razorpay' });
  } catch (e: any) {
    threw = true;
    dim(`replay threw: ${e.message ?? e}`);
  }
  const v = await getVault(fan);
  assert(v.coinBalance === 1000, 'coin balance is exactly 1000 (not 2000) after replay', v);
  const purchases = await db.select({ n: sql<number>`COUNT(*)::int` }).from(coinPurchases).where(eq(coinPurchases.userId, fan));
  assert(purchases[0].n === 1, 'exactly one coin_purchases row exists for this gateway_ref', purchases[0]);
  if (threw) dim('(replay rejected by exception — also acceptable)');
}

async function testServiceCompletionConservation() {
  header('3. Service completion: payout + fee == priceInrPaid (conservation)');
  const buyer = await makeUser('fan');
  const creator = await makeUser('creator');
  const price = 100000;
  const { req, fee, payout } = await makeServiceRequest(buyer, creator, price);
  assert(payout + fee === price, `conservation: ${payout} + ${fee} == ${price}`);

  await db.update(serviceRequests).set({ status: 'completed', completedAt: new Date() }).where(eq(serviceRequests.id, req.id));
  const beforeCreator = await getVault(creator);
  await settleCompletedRequest(req.id);
  const afterCreator = await getVault(creator);

  assert(afterCreator.inrBalance - beforeCreator.inrBalance === payout, 'creator vault credited by exactly payout amount');
  const buyerSum = await txnSums(buyer);
  const creatorSum = await txnSums(creator);
  assert(buyerSum.inrSettled === -fee, `buyer ledger nets to -fee (${-fee})`, buyerSum);
  assert(creatorSum.inrSettled === payout, `creator ledger nets to +payout (${payout})`, creatorSum);
}

async function testDoubleSettleProtection() {
  header('4. Double-settle protection: second settle MUST NOT double-credit');
  const buyer = await makeUser('fan');
  const creator = await makeUser('creator');
  const price = 80000;
  const { req, payout } = await makeServiceRequest(buyer, creator, price);
  await db.update(serviceRequests).set({ status: 'completed', completedAt: new Date() }).where(eq(serviceRequests.id, req.id));

  await settleCompletedRequest(req.id);
  const afterFirst = await getVault(creator);
  const txCount1 = await txnCount(creator, 'service_payout');

  await settleCompletedRequest(req.id);
  const afterSecond = await getVault(creator);
  const txCount2 = await txnCount(creator, 'service_payout');

  assert(afterSecond.inrBalance === afterFirst.inrBalance, 'second settle did not change vault balance', { afterFirst, afterSecond });
  assert(txCount2 === txCount1, 'no duplicate service_payout transaction inserted', { before: txCount1, after: txCount2 });
}

async function testDoubleRefundProtection() {
  header('5. Double-refund protection: second refund MUST NOT insert another row');
  const buyer = await makeUser('fan');
  const creator = await makeUser('creator');
  const { req } = await makeServiceRequest(buyer, creator, 50000);
  await db.update(serviceRequests).set({ status: 'cancelled', cancelledAt: new Date() }).where(eq(serviceRequests.id, req.id));

  await refundRequest(req.id, 'first');
  const c1 = await txnCount(buyer, 'refund');
  await refundRequest(req.id, 'second');
  const c2 = await txnCount(buyer, 'refund');

  assert(c2 === c1, 'no duplicate refund transaction inserted on second call', { before: c1, after: c2 });
}

async function testGoalContributionConcurrency() {
  header('6. Concurrent goal contributions: no lost or duplicate coins');
  const creator = await makeUser('creator');
  const fans: string[] = [];
  for (let i = 0; i < 10; i++) fans.push(await makeUser('fan'));
  for (const f of fans) {
    await creditCoins({ userId: f, coins: 1000, inrPaid: 100000, gatewayRef: `mfy_${randomUUID()}`, gateway: 'razorpay' });
  }
  const goalId = randomUUID();
  tracked.goals.push(goalId);
  await db.insert(squadGoals).values({
    id: goalId,
    creatorId: creator,
    title: 'Concurrency test',
    targetCoins: 100000,
    currentCoins: 0,
    contributorsCount: 0,
    status: 'active',
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const COINS_PER_FAN = 100;
  await Promise.all(fans.map((f) => contributeToGoal({ fanId: f, goalId, coins: COINS_PER_FAN })));

  const g = await db.query.squadGoals.findFirst({ where: eq(squadGoals.id, goalId) });
  const expectedTotal = fans.length * COINS_PER_FAN;
  assert(g?.currentCoins === expectedTotal, `goal current_coins == ${expectedTotal} (got ${g?.currentCoins})`);
  assert(g?.contributorsCount === fans.length, `contributors_count == ${fans.length} (got ${g?.contributorsCount})`);

  let allFansLost100 = true;
  for (const f of fans) {
    const v = await getVault(f);
    if (v.coinBalance !== 1000 - COINS_PER_FAN) { allFansLost100 = false; break; }
  }
  assert(allFansLost100, 'every fan vault decreased by exactly 100');
}

async function testGlobalLedgerInvariant() {
  header('7. Global invariant: each user vault.coin_balance == SUM(amount_coins)');
  let allOk = true;
  const offenders: any[] = [];
  for (const u of tracked.users) {
    const v = await getVault(u);
    const s = await txnSums(u);
    if (v.coinBalance !== s.coins) {
      allOk = false;
      offenders.push({ u, vault: v.coinBalance, ledger: s.coins });
    }
  }
  assert(allOk, 'all test users: vault.coin_balance == ledger SUM(amount_coins)', offenders.slice(0, 5));
}

async function cleanup() {
  if (!tracked.users.length) return;
  const ids = tracked.users;
  await db.delete(squadGoalContributions).where(inArray(squadGoalContributions.fanId, ids));
  await db.delete(coinPurchases).where(inArray(coinPurchases.userId, ids));
  await db.delete(transactions).where(or(inArray(transactions.userId, ids), inArray(transactions.counterpartyId, ids)));
  await db.delete(serviceRequests).where(or(inArray(serviceRequests.buyerId, ids), inArray(serviceRequests.creatorId, ids)));
  await db.delete(services).where(inArray(services.creatorId, ids));
  if (tracked.goals.length) await db.delete(squadGoals).where(inArray(squadGoals.id, tracked.goals));
  await db.delete(squadRanks).where(or(inArray(squadRanks.creatorId, ids), inArray(squadRanks.fanId, ids)));
  await db.delete(messageThreads).where(or(inArray(messageThreads.creatorId, ids), inArray(messageThreads.fanId, ids)));
  await db.delete(vaultBalances).where(inArray(vaultBalances.userId, ids));
  await db.delete(users).where(inArray(users.id, ids));
}

// ─── run ──────────────────────────────────────────────────────────
async function main() {
  try {
    await testCoinPurchaseConservation();
    await testCoinPurchaseIdempotency();
    await testServiceCompletionConservation();
    await testDoubleSettleProtection();
    await testDoubleRefundProtection();
    await testGoalContributionConcurrency();
    await testGlobalLedgerInvariant();
  } catch (e: any) {
    red(`uncaught: ${e.stack ?? e.message ?? e}`);
    failed++;
  } finally {
    console.log(`\n\x1b[1mCleaning up ${tracked.users.length} test users...\x1b[0m`);
    await cleanup().catch((e) => red(`cleanup failed: ${e.message}`));
  }
  console.log(`\n\x1b[1mResults: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
