import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, serviceRequests, services } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { platformFee } from '@/lib/utils';
import { createOrder } from '@/lib/payments/razorpay';

const CreateRequestSchema = z.object({
  serviceId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

/**
 * POST /api/requests
 *
 * Creates a service request in `pending` state and returns a Razorpay order
 * the buyer's client must complete via Razorpay Checkout.
 *
 * On payment success, the Razorpay webhook (or client-side `verify` call)
 * advances this request to `accepted_pending_creator` (an alias for `pending`
 * in our state machine — the creator still needs to accept).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  const parse = CreateRequestSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parse.error.flatten() }, { status: 400 });
  }

  // 1. Load the service
  const service = await db.query.services.findFirst({
    where: eq(services.id, parse.data.serviceId),
  });
  if (!service || service.status !== 'live') {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 404 });
  }

  if (service.creatorId === session.user.id) {
    return NextResponse.json({ error: 'cannot_book_own_service' }, { status: 400 });
  }

  // 2. Compute commission split
  const fee = platformFee(service.priceInr);
  const payout = service.priceInr - fee;

  // 3. Insert pending request
  const [req] = await db
    .insert(serviceRequests)
    .values({
      serviceId: service.id,
      creatorId: service.creatorId,
      buyerId: session.user.id,
      status: 'pending',
      priceInrPaid: service.priceInr,
      platformFeeInr: fee,
      creatorPayoutInr: payout,
      notes: parse.data.notes,
    })
    .returning();

  // 4. Create a Razorpay order tied to this request
  const order = await createOrder({
    amountInr: service.priceInr,
    receipt: `req-${req.id.slice(0, 8)}`,
    notes: { request_id: req.id, service_id: service.id, buyer_id: session.user.id },
  });

  return NextResponse.json({
    request: req,
    razorpay: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    },
  }, { status: 201 });
}
