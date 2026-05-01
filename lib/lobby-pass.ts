/**
 * Lobby Pass logic — atomic bidding with coin escrow.
 *
 * Invariants:
 *   - Coins on an active bid are escrowed (held in `transactions`, deducted from
 *     vault). When outbid, those coins are refunded to the bidder's vault.
 *   - At most one `winning` bid per (pass, bidder). Bids by the same user
 *     replace prior bids from that user.
 *   - When a pass closes, top N (where N = pass.slot_count) bids become `won`,
 *     the rest are refunded.
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from './db';
import {
  lobbyPasses,
  lobbyPassBids,
  vaultBalances,
  transactions,
  messageThreads,
} from './db/schema';
import { upsertSquadRank } from './ledger';
import { publish, channels, events } from './pusher';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class LobbyPassError extends Error {
  constructor(public code: string, msg: string) {
    super(msg);
    this.name = 'LobbyPassError';
  }
}

// ============================================================================
// PLACE BID
// ============================================================================

export async function placeBid(opts: { passId: string; bidderId: string; coinAmount: number }) {
  const { passId, bidderId, coinAmount } = opts;
  if (coinAmount <= 0) throw new LobbyPassError('invalid_amount', 'Bid must be positive');

  return db.transaction(async (tx) => {
    // 1. Load pass
    const pass = await tx.query.lobbyPasses.findFirst({ where: eq(lobbyPasses.id, passId) });
    if (!pass) throw new LobbyPassError('pass_not_found', 'Lobby Pass not found');
    if (pass.status !== 'open') throw new LobbyPassError('pass_closed', 'Pass is no longer accepting bids');
    if (new Date(pass.endsAt) <= new Date()) throw new LobbyPassError('pass_expired', 'Pass auction has ended');
    if (pass.creatorId === bidderId) throw new LobbyPassError('own_pass', 'Cannot bid on your own pass');

    // 2. Validate min bid
    if (coinAmount < pass.minBidCoins) {
      throw new LobbyPassError('below_min_bid', `Minimum bid is ${pass.minBidCoins} coins`);
    }

    // 3. Refund existing active/winning bid by this bidder (replace, don't stack)
    const existingMine = await tx.query.lobbyPassBids.findFirst({
      where: and(
        eq(lobbyPassBids.passId, passId),
        eq(lobbyPassBids.bidderId, bidderId),
        sql`${lobbyPassBids.status} IN ('active', 'winning', 'outbid')`,
      ),
      orderBy: [desc(lobbyPassBids.bidAt)],
    });

    if (existingMine && existingMine.status !== 'refunded') {
      // Refund prior bid coins back to vault, mark as refunded
      await refundBidEscrow(tx, bidderId, existingMine.coinAmount, 'replaced_by_higher_bid', existingMine.id);
      await tx
        .update(lobbyPassBids)
        .set({ status: 'refunded', refundedAt: new Date() })
        .where(eq(lobbyPassBids.id, existingMine.id));
    }

    // 4. Validate balance + escrow new bid coins
    const vault = await tx.query.vaultBalances.findFirst({ where: eq(vaultBalances.userId, bidderId) });
    if (!vault || vault.coinBalance < coinAmount) {
      throw new LobbyPassError('insufficient_coins', `You need ${coinAmount} coins; you have ${vault?.coinBalance ?? 0}`);
    }

    await tx
      .update(vaultBalances)
      .set({ coinBalance: sql`${vaultBalances.coinBalance} - ${coinAmount}` })
      .where(eq(vaultBalances.userId, bidderId));

    const [escrowTx] = await tx
      .insert(transactions)
      .values({
        userId: bidderId,
        counterpartyId: pass.creatorId,
        type: 'lobby_pass_bid',
        amountCoins: -coinAmount,
        status: 'pending', // 'pending' = escrowed; settles to success on win, reverses on outbid
        gateway: 'internal',
        description: `Lobby Pass bid: ${pass.title}`,
      })
      .returning();

    // 5. Insert new bid
    const [newBid] = await tx
      .insert(lobbyPassBids)
      .values({
        passId,
        bidderId,
        coinAmount,
        status: 'active',
        transactionId: escrowTx.id,
      })
      .returning();

    // 6. Recompute top N — newest > slot_count get marked 'outbid' but coins remain escrowed
    //    until pass closes (this prevents losing your slot if a higher bid lands then is refunded)
    const topBids = await tx
      .select()
      .from(lobbyPassBids)
      .where(and(eq(lobbyPassBids.passId, passId), sql`${lobbyPassBids.status} IN ('active', 'winning', 'outbid')`))
      .orderBy(desc(lobbyPassBids.coinAmount), desc(lobbyPassBids.bidAt))
      .limit(50);

    for (let i = 0; i < topBids.length; i++) {
      const b = topBids[i];
      const desiredStatus = i < pass.slotCount ? (i === 0 ? 'winning' : 'active') : 'outbid';
      if (b.status !== desiredStatus) {
        await tx
          .update(lobbyPassBids)
          .set({ status: desiredStatus })
          .where(eq(lobbyPassBids.id, b.id));
      }
    }

    return { bid: newBid, topBids };
  });
}

async function refundBidEscrow(tx: Tx, userId: string, coins: number, reason: string, bidId: string) {
  await tx
    .update(vaultBalances)
    .set({ coinBalance: sql`${vaultBalances.coinBalance} + ${coins}` })
    .where(eq(vaultBalances.userId, userId));

  await tx.insert(transactions).values({
    userId,
    type: 'refund',
    amountCoins: coins,
    status: 'success',
    relatedBidId: bidId,
    gateway: 'internal',
    description: reason,
    settledAt: new Date(),
  });
}

// ============================================================================
// CLOSE PASS — pass.endsAt has elapsed; finalize winners + refund losers
// ============================================================================

export async function closePass(passId: string) {
  return db.transaction(async (tx) => {
    const pass = await tx.query.lobbyPasses.findFirst({ where: eq(lobbyPasses.id, passId) });
    if (!pass) throw new LobbyPassError('pass_not_found', 'Pass not found');
    if (pass.status !== 'open') return { alreadyClosed: true };

    // Lock the pass
    await tx
      .update(lobbyPasses)
      .set({ status: 'closed' })
      .where(eq(lobbyPasses.id, passId));

    // Sort all live bids by amount desc
    const liveBids = await tx
      .select()
      .from(lobbyPassBids)
      .where(and(eq(lobbyPassBids.passId, passId), sql`${lobbyPassBids.status} IN ('active', 'winning', 'outbid')`))
      .orderBy(desc(lobbyPassBids.coinAmount), desc(lobbyPassBids.bidAt));

    const winners = liveBids.slice(0, pass.slotCount);
    const losers = liveBids.slice(pass.slotCount);

    // 1. Mark winners 'won'; settle their escrow transaction
    for (const w of winners) {
      await tx
        .update(lobbyPassBids)
        .set({ status: 'won', wonAt: new Date() })
        .where(eq(lobbyPassBids.id, w.id));

      if (w.transactionId) {
        await tx
          .update(transactions)
          .set({ status: 'success', settledAt: new Date() })
          .where(eq(transactions.id, w.transactionId));
      }

      // Auto-create / refresh DM thread for the winner
      await tx
        .insert(messageThreads)
        .values({
          creatorId: pass.creatorId,
          fanId: w.bidderId,
          unlockSource: 'lobby_pass_won',
          unlockRefId: w.id,
        })
        .onConflictDoNothing();

      // Update squad rank for the winning fan (their spend counts toward tier)
      await upsertSquadRank({
        creatorId: pass.creatorId,
        fanId: w.bidderId,
        addCoins: w.coinAmount,
        tx,
      });
    }

    // 2. Refund losers
    for (const l of losers) {
      if (l.status === 'refunded') continue;
      await refundBidEscrow(tx, l.bidderId, l.coinAmount, 'lobby_pass_outbid_at_close', l.id);
      await tx
        .update(lobbyPassBids)
        .set({ status: 'refunded', refundedAt: new Date() })
        .where(eq(lobbyPassBids.id, l.id));
    }

    // 3. Record platform fee on each winning bid (creator gets the rest as coin credit)
    //    Platform fee is taken in coins for lobby passes (different from INR services)
    //    For simplicity now: creator earns the full coin amount; fee tracked in ledger.

    return {
      winners: winners.map((w) => ({ bidId: w.id, bidderId: w.bidderId, amount: w.coinAmount })),
      losersRefunded: losers.length,
    };
  });
}

// ============================================================================
// LISTING HELPERS
// ============================================================================

export async function getPassWithBids(passId: string) {
  const pass = await db.query.lobbyPasses.findFirst({ where: eq(lobbyPasses.id, passId) });
  if (!pass) return null;

  const bids = await db.query.lobbyPassBids.findMany({
    where: eq(lobbyPassBids.passId, passId),
    orderBy: [desc(lobbyPassBids.coinAmount), desc(lobbyPassBids.bidAt)],
    limit: 30,
  });

  return { pass, bids };
}
