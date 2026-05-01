import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, coinPurchases } from '@/lib/db';
import { auth } from '@/lib/auth';
import { createOrder } from '@/lib/payments/razorpay';
import { COIN_RATE, MIN_TOPUP_INR } from '@/lib/constants';
import { rateLimit } from '@/lib/rate-limit';
import { requireAge } from '@/lib/age';

const TopUpSchema = z.object({
  inrAmount: z.number().int().min(MIN_TOPUP_INR),
});

/**
 * POST /api/coins
 * Initiates a coin top-up: creates a Razorpay order, records a pending coin_purchase row.
 * Razorpay webhook (`/api/webhooks/razorpay`) finalizes credit on success.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Rate limit: 10 top-ups per hour per user
  const rl = await rateLimit('coins', session.user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'retry-after': String(rl.retryAfter) } },
    );
  }

  // Age gate: 18+ required for coin purchase
  try {
    await requireAge(session.user.id);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await request.json();
  const parse = TopUpSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const inrPaise = parse.data.inrAmount * 100;
  const coins = Math.floor(parse.data.inrAmount * COIN_RATE);

  const order = await createOrder({
    amountInr: inrPaise,
    receipt: `coins-${Date.now()}`,
    notes: { user_id: session.user.id, coins: String(coins) },
  });

  await db.insert(coinPurchases).values({
    userId: session.user.id,
    coins,
    inrPaid: inrPaise,
    gateway: 'razorpay',
    gatewayRef: order.id,
    status: 'pending',
  });

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    coins,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
