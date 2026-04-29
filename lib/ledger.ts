/**
 * Atomic ledger operations for Squadly.
 *
 * All money/coin movements MUST flow through here. We never mutate vault_balances
 * directly without also writing a corresponding transactions row. This keeps the
 * ledger as the single source of truth and makes the system auditable.
 *
 * Every public function in this file is a transaction boundary — pass the same
 * `tx` to nested calls when chaining operations.
 */
import { eq, sql, and } from 'drizzle-orm';
import { db } from './db';
import {
  vaultBalances,
  transactions,
  serviceRequests,
  squadGoals,
  squadGoalContributions,
  squadRanks,
  type Transaction,
} from './db/schema';
import { tierForCoins } from './utils';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Ensure a vault_balances row exists for a user; create with zero balances if not.
 */
export async function ensureVault(userId: string, tx?: Tx) {
  const exec = tx ?? db;
  await exec
    .insert(vaultBalances)
    .values({ userId, inrBalance: 0, coinBalance: 0, inrPending: 0 })
    .onConflictDoNothing();
}

// ============================================================================
// COIN OPERATIONS
// ============================================================================

/**
 * Credit coins to a user's vault. Used after Razorpay confirms a coin purchase.
 * Records a `coin_purchase` transaction tied to the gateway ref.
 */
export async function creditCoins(opts: {
  userId: string;
  coins: number;
  inrPaid: number;          // paise
  gatewayRef: string;
  gateway: 'razorpay' | 'stripe';
}) {
  if (opts.coins <= 0) throw new Error('coins must be positive');

  return db.transaction(async (tx) => {
    await ensureVault(opts.userId, tx);

    await tx
      .update(vaultBalances)
      .set({ coinBalance: sql`${vaultBalances.coinBalance} + ${opts.coins}` })
      .where(eq(vaultBalances.userId, opts.userId));

    const [txRow] = await tx
      .insert(transactions)
      .values({
        userId: opts.userId,
        type: 'coin_purchase',
        amountInr: -opts.inrPaid,
        amountCoins: opts.coins,
        status: 'success',
        gateway: opts.gateway,
        gatewayRef: opts.gatewayRef,
        description: `Coin top-up: ${opts.coins} coins`,
        settledAt: new Date(),
      })
      .returning();

    return txRow;
  });
}

/**
 * Debit coins from a user's vault. Throws if insufficient balance.
 * Used for: goal contributions, lobby pass bids, gifting.
 */
export async function debitCoins(opts: {
  userId: string;
  coins: number;
  type: 'goal_contribution' | 'lobby_pass_bid' | 'tip';
  counterpartyId?: string;
  relatedGoalId?: string;
  relatedBidId?: string;
  description?: string;
  tx?: Tx;
}) {
  if (opts.coins <= 0) throw new Error('coins must be positive');

  const exec = async (t: Tx) => {
    const vault = await t.query.vaultBalances.findFirst({
      where: eq(vaultBalances.userId, opts.userId),
    });
    if (!vault || vault.coinBalance < opts.coins) {
      throw new Error('insufficient_coins');
    }

    await t
      .update(vaultBalances)
      .set({ coinBalance: sql`${vaultBalances.coinBalance} - ${opts.coins}` })
      .where(eq(vaultBalances.userId, opts.userId));

    const [txRow] = await t
      .insert(transactions)
      .values({
        userId: opts.userId,
        counterpartyId: opts.counterpartyId,
        type: opts.type,
        amountCoins: -opts.coins,
        status: 'success',
        relatedGoalId: opts.relatedGoalId,
        relatedBidId: opts.relatedBidId,
        gateway: 'internal',
        description: opts.description,
        settledAt: new Date(),
      })
      .returning();

    return txRow;
  };

  return opts.tx ? exec(opts.tx) : db.transaction(exec);
}

/** Refund coins to a user (e.g. outbid lobby pass bid, expired goal). */
export async function refundCoins(opts: {
  userId: string;
  coins: number;
  reason: string;
  relatedGoalId?: string;
  relatedBidId?: string;
  tx?: Tx;
}) {
  const exec = async (t: Tx) => {
    await ensureVault(opts.userId, t);

    await t
      .update(vaultBalances)
      .set({ coinBalance: sql`${vaultBalances.coinBalance} + ${opts.coins}` })
      .where(eq(vaultBalances.userId, opts.userId));

    const [txRow] = await t
      .insert(transactions)
      .values({
        userId: opts.userId,
        type: 'refund',
        amountCoins: opts.coins,
        status: 'success',
        relatedGoalId: opts.relatedGoalId,
        relatedBidId: opts.relatedBidId,
        gateway: 'internal',
        description: opts.reason,
        settledAt: new Date(),
      })
      .returning();

    return txRow;
  };

  return opts.tx ? exec(opts.tx) : db.transaction(exec);
}

// ============================================================================
// SERVICE REQUEST PAYMENT FLOW
// ============================================================================

/**
 * On creation of a service request, the buyer's payment is captured (via Razorpay)
 * and held in escrow. The buyer's vault doesn't change — money stays at the gateway
 * until either creator completes (payout) or cancellation (refund).
 */

/** Mark a service request payment captured; INR moves from gateway → platform escrow. */
export async function capturePayment(opts: {
  requestId: string;
  userId: string;          // the buyer
  amountInr: number;       // paise
  gatewayRef: string;
  gateway: 'razorpay' | 'stripe';
}) {
  return db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      userId: opts.userId,
      type: 'service_payment',
      amountInr: -opts.amountInr,
      status: 'success',
      relatedRequestId: opts.requestId,
      gateway: opts.gateway,
      gatewayRef: opts.gatewayRef,
      description: 'Service payment captured',
      settledAt: new Date(),
    });
  });
}

/**
 * Creator marks a request completed → split commission, credit creator's vault,
 * release platform fee. INR balance becomes withdrawable after a 24h hold (Phase 1B).
 */
export async function settleCompletedRequest(requestId: string) {
  return db.transaction(async (tx) => {
    const req = await tx.query.serviceRequests.findFirst({
      where: eq(serviceRequests.id, requestId),
    });
    if (!req) throw new Error('request_not_found');
    if (req.status !== 'completed') throw new Error('request_not_completed');

    await ensureVault(req.creatorId, tx);

    // Credit creator (price - platform fee)
    await tx
      .update(vaultBalances)
      .set({ inrBalance: sql`${vaultBalances.inrBalance} + ${req.creatorPayoutInr}` })
      .where(eq(vaultBalances.userId, req.creatorId));

    // Ledger: payout to creator
    await tx.insert(transactions).values({
      userId: req.creatorId,
      counterpartyId: req.buyerId,
      type: 'service_payout',
      amountInr: req.creatorPayoutInr,
      status: 'success',
      relatedRequestId: req.id,
      gateway: 'internal',
      description: 'Service completed — payout to vault',
      settledAt: new Date(),
    });

    // Ledger: platform fee captured (no vault change; tracked for accounting)
    await tx.insert(transactions).values({
      userId: req.buyerId,
      type: 'platform_fee',
      amountInr: -req.platformFeeInr,
      status: 'success',
      relatedRequestId: req.id,
      gateway: 'internal',
      description: 'Platform commission',
      settledAt: new Date(),
    });
  });
}

/** Refund a cancelled / disputed request to the buyer. */
export async function refundRequest(requestId: string, reason: string) {
  return db.transaction(async (tx) => {
    const req = await tx.query.serviceRequests.findFirst({
      where: eq(serviceRequests.id, requestId),
    });
    if (!req) throw new Error('request_not_found');

    // TODO: trigger Razorpay refund API call here; on webhook success record the actual refund txn
    await tx.insert(transactions).values({
      userId: req.buyerId,
      type: 'refund',
      amountInr: req.priceInrPaid,
      status: 'pending',
      relatedRequestId: req.id,
      gateway: 'razorpay',
      description: `Refund: ${reason}`,
    });
  });
}

// ============================================================================
// SQUAD GOAL CONTRIBUTION (combines coin debit + goal increment + rank update)
// ============================================================================

export async function contributeToGoal(opts: {
  fanId: string;
  goalId: string;
  coins: number;
}) {
  if (opts.coins <= 0) throw new Error('coins must be positive');

  return db.transaction(async (tx) => {
    const goal = await tx.query.squadGoals.findFirst({
      where: eq(squadGoals.id, opts.goalId),
    });
    if (!goal) throw new Error('goal_not_found');
    if (goal.status !== 'active') throw new Error('goal_not_active');
    if (goal.deadline < new Date()) throw new Error('goal_expired');

    // 1. Debit coins (validates balance)
    const coinTx = await debitCoins({
      userId: opts.fanId,
      coins: opts.coins,
      type: 'goal_contribution',
      counterpartyId: goal.creatorId,
      relatedGoalId: goal.id,
      description: `Squad Goal: ${goal.title}`,
      tx,
    });

    // 2. Insert contribution
    await tx.insert(squadGoalContributions).values({
      goalId: goal.id,
      fanId: opts.fanId,
      coins: opts.coins,
      transactionId: coinTx.id,
    });

    // 3. Increment goal totals
    const updated = await tx
      .update(squadGoals)
      .set({
        currentCoins: sql`${squadGoals.currentCoins} + ${opts.coins}`,
        contributorsCount: sql`${squadGoals.contributorsCount} + 1`,
      })
      .where(eq(squadGoals.id, goal.id))
      .returning();

    // 4. If threshold met, mark funded
    if (updated[0] && updated[0].currentCoins >= updated[0].targetCoins) {
      await tx
        .update(squadGoals)
        .set({ status: 'funded', fundedAt: new Date() })
        .where(eq(squadGoals.id, goal.id));
    }

    // 5. Update fan's squad_rank for this creator
    await upsertSquadRank({ creatorId: goal.creatorId, fanId: opts.fanId, addCoins: opts.coins, tx });

    return { goal: updated[0], transactionId: coinTx.id };
  });
}

/**
 * Upsert the squad_ranks row for (creator, fan): increment period_coins_spent
 * and recompute current_tier.
 */
export async function upsertSquadRank(opts: {
  creatorId: string;
  fanId: string;
  addCoins: number;
  tx?: Tx;
}) {
  const exec = async (t: Tx) => {
    const existing = await t.query.squadRanks.findFirst({
      where: and(eq(squadRanks.creatorId, opts.creatorId), eq(squadRanks.fanId, opts.fanId)),
    });

    if (!existing) {
      const tier = tierForCoins(opts.addCoins);
      await t.insert(squadRanks).values({
        creatorId: opts.creatorId,
        fanId: opts.fanId,
        totalCoinsSpent: opts.addCoins,
        periodCoinsSpent: opts.addCoins,
        currentTier: tier,
        lastActiveAt: new Date(),
      });
      return;
    }

    const newPeriod = existing.periodCoinsSpent + opts.addCoins;
    const newTotal = existing.totalCoinsSpent + opts.addCoins;
    const newTier = tierForCoins(newPeriod);

    await t
      .update(squadRanks)
      .set({
        totalCoinsSpent: newTotal,
        periodCoinsSpent: newPeriod,
        currentTier: newTier,
        lastActiveAt: new Date(),
      })
      .where(eq(squadRanks.id, existing.id));
  };

  return opts.tx ? exec(opts.tx) : db.transaction(exec);
}
