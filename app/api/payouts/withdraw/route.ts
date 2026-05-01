import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db, vaultBalances, transactions, users, providerProfiles } from '@/lib/db';
import { auth } from '@/lib/auth';
import { ensureContact, createFundAccountUPI, createPayout } from '@/lib/payments/razorpay-x';
import { rateLimit } from '@/lib/rate-limit';
import { requireAge } from '@/lib/age';

const WithdrawSchema = z.object({
  amountInr: z.number().int().min(50000), // min ₹500 in paise
  vpa: z.string().regex(/^[\w.\-]+@[\w]+$/, 'Invalid UPI ID'),
});

/**
 * POST /api/payouts/withdraw
 * Creator initiates a withdrawal from their INR vault balance to a UPI VPA.
 *
 * Atomic: debits the vault balance, inserts a `service_payout`-style transaction,
 * then triggers the actual Razorpay X payout. Webhook will reconcile the status.
 *
 * Note: a 24h hold on freshly settled requests should be applied via a separate
 * computed `withdrawable_balance` (not implemented here — Phase 2).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rl = await rateLimit('withdraw', session.user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'retry-after': String(rl.retryAfter) } },
    );
  }

  try {
    await requireAge(session.user.id);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await request.json();
  const parse = WithdrawSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parse.error.flatten() }, { status: 400 });
  }

  const userId = session.user.id;
  const { amountInr, vpa } = parse.data;

  // Lock + check balance
  const vault = await db.query.vaultBalances.findFirst({
    where: eq(vaultBalances.userId, userId),
  });
  if (!vault || vault.inrBalance < amountInr) {
    return NextResponse.json({ error: 'insufficient_balance' }, { status: 400 });
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  // 1. Get/create Razorpay contact
  const contact = await ensureContact({
    userId: user.id,
    name: user.displayName,
    email: user.email,
  });

  // 2. Register UPI fund account (RX dedupes by VPA + contact)
  const fundAccount = await createFundAccountUPI({
    contactId: contact.id,
    vpa,
  });

  // 3. Insert pending transaction + debit vault atomically
  const txId = await db.transaction(async (tx) => {
    await tx
      .update(vaultBalances)
      .set({
        inrBalance: sql`${vaultBalances.inrBalance} - ${amountInr}`,
        inrPending: sql`${vaultBalances.inrPending} + ${amountInr}`,
      })
      .where(eq(vaultBalances.userId, userId));

    const [txRow] = await tx
      .insert(transactions)
      .values({
        userId,
        type: 'service_payout',
        amountInr: -amountInr,
        status: 'pending',
        gateway: 'razorpay',
        description: `Withdrawal to ${vpa}`,
      })
      .returning();
    return txRow.id;
  });

  // 4. Trigger payout
  try {
    const payout = await createPayout({
      fundAccountId: fundAccount.id,
      amountPaise: amountInr,
      referenceId: txId,
      narration: `Squadly payout`,
      notes: { user_id: userId, transaction_id: txId },
    });

    await db
      .update(transactions)
      .set({ gatewayRef: payout.id, status: 'pending' })
      .where(eq(transactions.id, txId));

    return NextResponse.json({
      transactionId: txId,
      payout: { id: payout.id, status: payout.status, utr: payout.utr },
    });
  } catch (e: any) {
    // Reverse the debit on payout failure
    await db.transaction(async (tx) => {
      await tx
        .update(vaultBalances)
        .set({
          inrBalance: sql`${vaultBalances.inrBalance} + ${amountInr}`,
          inrPending: sql`${vaultBalances.inrPending} - ${amountInr}`,
        })
        .where(eq(vaultBalances.userId, userId));
      await tx
        .update(transactions)
        .set({ status: 'failed', description: `Payout failed: ${e.message}` })
        .where(eq(transactions.id, txId));
    });
    return NextResponse.json({ error: 'payout_failed', message: e.message }, { status: 502 });
  }
}
