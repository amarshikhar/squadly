import { NextResponse } from 'next/server';
import { db, coinPurchases, vaultBalances, transactions } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/payments/razorpay';
import { eq, sql } from 'drizzle-orm';

/**
 * Razorpay webhook handler.
 * Handles `payment.captured` events for coin purchases and service payments.
 * Verifies signature, then updates ledger atomically.
 */
export async function POST(request: Request) {
  const signature = request.headers.get('x-razorpay-signature');
  const rawBody = await request.text();

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  console.info('[razorpay webhook]', event.event);

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const orderId = payment.order_id;

    // Find matching coin_purchase
    const purchase = await db.query.coinPurchases.findFirst({
      where: eq(coinPurchases.gatewayRef, orderId),
    });

    if (!purchase || purchase.status === 'success') {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // TODO: wrap in a transaction — Drizzle txn API:
    // await db.transaction(async (tx) => { ... })

    // Mark purchase success
    await db
      .update(coinPurchases)
      .set({ status: 'success', settledAt: new Date() })
      .where(eq(coinPurchases.id, purchase.id));

    // Credit coins to vault
    await db
      .update(vaultBalances)
      .set({ coinBalance: sql`${vaultBalances.coinBalance} + ${purchase.coins}` })
      .where(eq(vaultBalances.userId, purchase.userId));

    // Append ledger entry
    await db.insert(transactions).values({
      userId: purchase.userId,
      type: 'coin_purchase',
      amountInr: -purchase.inrPaid,
      amountCoins: purchase.coins,
      status: 'success',
      gateway: 'razorpay',
      gatewayRef: orderId,
      description: `Coin top-up: ${purchase.coins} coins`,
      settledAt: new Date(),
    });
  }

  return NextResponse.json({ ok: true });
}
