/**
 * Referral codes.
 *
 *   getOrCreateCode(userId)        — ensures a referrer has an active invite code
 *   redeem(code, redeemerId)       — validates + marks as redeemed (does NOT pay yet)
 *   payoutOnFirstTransaction(uid)  — when a redeemer makes their first paid action,
 *                                    grant 100 coins to both sides
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from './db';
import { referrals, vaultBalances, transactions } from './db/schema';
import { ensureVault } from './ledger';
import { emit } from './notifications';
import { randomBytes } from 'crypto';

function generateCode(): string {
  // 8 chars uppercase alphanumeric, exclude ambiguous (0/O, 1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[buf[i] % chars.length];
  return out;
}

export async function getOrCreateCode(userId: string) {
  const existing = await db.query.referrals.findFirst({
    where: and(eq(referrals.referrerId, userId), eq(referrals.status, 'pending')),
  });
  if (existing) return existing;

  // Try a few times in case of collision
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const code = generateCode();
      const [row] = await db
        .insert(referrals)
        .values({
          referrerId: userId,
          code,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        })
        .returning();
      return row;
    } catch (e: any) {
      if (!String(e.message ?? '').includes('unique')) throw e;
    }
  }
  throw new Error('failed_to_generate_code');
}

export class ReferralError extends Error {
  constructor(public code: string, msg: string) {
    super(msg);
  }
}

export async function redeem(code: string, redeemerId: string) {
  const ref = await db.query.referrals.findFirst({
    where: eq(referrals.code, code.toUpperCase()),
  });
  if (!ref) throw new ReferralError('not_found', 'Invalid referral code');
  if (ref.referrerId === redeemerId) throw new ReferralError('self_referral', 'Cannot redeem your own code');
  if (ref.redeemedBy) throw new ReferralError('already_used', 'Code already redeemed');
  if (new Date(ref.expiresAt) < new Date()) throw new ReferralError('expired', 'Code expired');

  // Check redeemer hasn't already redeemed any code
  const existing = await db.query.referrals.findFirst({ where: eq(referrals.redeemedBy, redeemerId) });
  if (existing) throw new ReferralError('already_redeemed_one', 'You have already used a referral code');

  await db
    .update(referrals)
    .set({ redeemedBy: redeemerId, redeemedAt: new Date(), status: 'redeemed' })
    .where(eq(referrals.id, ref.id));

  return ref;
}

/**
 * Called when the redeemer makes their first qualifying transaction (e.g. coin
 * purchase or paid service). Grants coins to both sides if not already paid.
 */
export async function payoutOnFirstTransaction(redeemerId: string) {
  const ref = await db.query.referrals.findFirst({
    where: and(eq(referrals.redeemedBy, redeemerId), eq(referrals.status, 'redeemed')),
  });
  if (!ref) return null;

  return db.transaction(async (tx) => {
    // Idempotent: check status again inside txn
    const fresh = await tx.query.referrals.findFirst({
      where: and(eq(referrals.id, ref.id), eq(referrals.status, 'redeemed')),
    });
    if (!fresh) return null;

    await ensureVault(ref.referrerId, tx);
    await ensureVault(redeemerId, tx);

    // Credit both sides
    await tx
      .update(vaultBalances)
      .set({ coinBalance: sql`${vaultBalances.coinBalance} + ${ref.referrerRewardCoins}` })
      .where(eq(vaultBalances.userId, ref.referrerId));

    await tx
      .update(vaultBalances)
      .set({ coinBalance: sql`${vaultBalances.coinBalance} + ${ref.redeemerRewardCoins}` })
      .where(eq(vaultBalances.userId, redeemerId));

    // Ledger entries
    await tx.insert(transactions).values([
      {
        userId: ref.referrerId,
        counterpartyId: redeemerId,
        type: 'tip', // closest fit; could add 'referral_bonus' enum later
        amountCoins: ref.referrerRewardCoins,
        status: 'success',
        gateway: 'internal',
        description: `Referral reward — code ${ref.code}`,
        settledAt: new Date(),
      },
      {
        userId: redeemerId,
        counterpartyId: ref.referrerId,
        type: 'tip',
        amountCoins: ref.redeemerRewardCoins,
        status: 'success',
        gateway: 'internal',
        description: `Referral redeemed — code ${ref.code}`,
        settledAt: new Date(),
      },
    ]);

    await tx
      .update(referrals)
      .set({ status: 'rewarded', rewardedAt: new Date() })
      .where(eq(referrals.id, ref.id));

    return ref;
  }).then(async (paid) => {
    if (paid) {
      await Promise.all([
        emit({
          userId: paid.referrerId,
          type: 'referral_redeemed',
          title: `Referral reward: +${paid.referrerRewardCoins} coins`,
          body: 'Your invite code was used. Coins are in your Vault.',
          link: '/vault',
          relatedId: paid.id,
        }),
        emit({
          userId: redeemerId,
          type: 'referral_redeemed',
          title: `Welcome bonus: +${paid.redeemerRewardCoins} coins`,
          body: 'Coins credited to your Vault.',
          link: '/vault',
          relatedId: paid.id,
        }),
      ]);
    }
    return paid;
  });
}
