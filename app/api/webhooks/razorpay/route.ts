import { NextResponse } from 'next/server';
import { db, coinPurchases, serviceRequests } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/payments/razorpay';
import { creditCoins, capturePayment } from '@/lib/ledger';
import { eq } from 'drizzle-orm';

/**
 * Razorpay webhook handler.
 * Handles:
 *   - `payment.captured` for coin purchases → credits coins to user vault
 *   - `payment.captured` for service requests → records payment capture (creator payout deferred to completion)
 */
export async function POST(request: Request) {
  const signature = request.headers.get('x-razorpay-signature');
  const rawBody = await request.text();

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  console.info('[razorpay webhook]', event.event);

  if (event.event !== 'payment.captured') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payment = event.payload.payment.entity;
  const orderId = payment.order_id;

  // 1. Coin purchase?
  const purchase = await db.query.coinPurchases.findFirst({
    where: eq(coinPurchases.gatewayRef, orderId),
  });
  if (purchase) {
    if (purchase.status === 'success') {
      return NextResponse.json({ ok: true, idempotent: true });
    }
    await creditCoins({
      userId: purchase.userId,
      coins: purchase.coins,
      inrPaid: purchase.inrPaid,
      gatewayRef: orderId,
      gateway: 'razorpay',
    });
    await db
      .update(coinPurchases)
      .set({ status: 'success', settledAt: new Date() })
      .where(eq(coinPurchases.id, purchase.id));
    return NextResponse.json({ ok: true, type: 'coin_purchase' });
  }

  // 2. Service request payment?
  const requestId = payment?.notes?.request_id;
  if (requestId) {
    const req = await db.query.serviceRequests.findFirst({
      where: eq(serviceRequests.id, requestId),
    });
    if (req) {
      await capturePayment({
        requestId: req.id,
        userId: req.buyerId,
        amountInr: payment.amount,
        gatewayRef: orderId,
        gateway: 'razorpay',
      });
      return NextResponse.json({ ok: true, type: 'service_payment' });
    }
  }

  // Unrecognized payment — log but don't fail
  console.warn('[razorpay webhook] unrecognized payment', orderId);
  return NextResponse.json({ ok: true, unmatched: true });
}
