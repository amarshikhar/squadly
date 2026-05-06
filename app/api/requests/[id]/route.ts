import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, serviceRequests } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { settleCompletedRequest, refundRequest } from '@/lib/ledger';
import { getRequestById } from '@/lib/db/queries';

const PatchSchema = z.object({
  action: z.enum(['accept', 'start', 'complete', 'cancel', 'abandon']),
  cancelReason: z.string().max(500).optional(),
});

/**
 * State machine:
 *
 *   pending  ──accept──▶  accepted  ──start──▶  in_progress  ──complete──▶  completed
 *      │                      │                                │
 *      └──cancel─────────────▶│ cancelled                       │
 *                             └──cancel──▶ cancelled (refund)   │
 *
 *   Anyone (creator OR buyer) may cancel while pending.
 *   Only creator may accept / start / complete.
 *   Buyer may cancel up until accepted.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const found = await getRequestById(params.id);
  if (!found) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Ensure caller is creator or buyer
  if (found.request.creatorId !== session.user.id && found.request.buyerId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return NextResponse.json(found);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  const parse = PatchSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const req = await db.query.serviceRequests.findFirst({
    where: eq(serviceRequests.id, params.id),
  });
  if (!req) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const isCreator = req.creatorId === session.user.id;
  const isBuyer = req.buyerId === session.user.id;

  if (!isCreator && !isBuyer) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  switch (parse.data.action) {
    case 'accept': {
      if (!isCreator) return NextResponse.json({ error: 'creator_only' }, { status: 403 });
      if (req.status !== 'pending') return NextResponse.json({ error: 'invalid_state' }, { status: 409 });

      await db
        .update(serviceRequests)
        .set({ status: 'accepted', acceptedAt: new Date() })
        .where(eq(serviceRequests.id, req.id));
      break;
    }

    case 'start': {
      if (!isCreator) return NextResponse.json({ error: 'creator_only' }, { status: 403 });
      if (req.status !== 'accepted') return NextResponse.json({ error: 'invalid_state' }, { status: 409 });

      await db
        .update(serviceRequests)
        .set({ status: 'in_progress', startedAt: new Date() })
        .where(eq(serviceRequests.id, req.id));
      break;
    }

    case 'complete': {
      if (!isCreator) return NextResponse.json({ error: 'creator_only' }, { status: 403 });
      if (req.status !== 'in_progress' && req.status !== 'accepted') {
        return NextResponse.json({ error: 'invalid_state' }, { status: 409 });
      }

      await db
        .update(serviceRequests)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(serviceRequests.id, req.id));

      // Move money: creator gets payout, platform takes commission
      await settleCompletedRequest(req.id);
      break;
    }

    case 'cancel': {
      // Buyer can cancel while pending; creator can cancel anytime before complete
      const cancellable = ['pending', 'accepted', 'in_progress'] as const;
      if (!cancellable.includes(req.status as any)) {
        return NextResponse.json({ error: 'invalid_state' }, { status: 409 });
      }

      await db
        .update(serviceRequests)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: parse.data.cancelReason ?? (isCreator ? 'cancelled_by_creator' : 'cancelled_by_buyer'),
        })
        .where(eq(serviceRequests.id, req.id));

      // Trigger refund to buyer
      await refundRequest(req.id, parse.data.cancelReason ?? 'request_cancelled');
      break;
    }

    case 'abandon': {
      // Buyer abandoning a never-paid pending request (e.g., closed Razorpay
      // modal without completing payment). No money was captured, so no
      // refund needed — we just mark it cancelled and tag the reason so the
      // outgoing-requests list can hide these from the buyer's view.
      if (!isBuyer) return NextResponse.json({ error: 'buyer_only' }, { status: 403 });
      if (req.status !== 'pending') {
        return NextResponse.json({ error: 'invalid_state' }, { status: 409 });
      }

      await db
        .update(serviceRequests)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: 'payment_abandoned',
        })
        .where(eq(serviceRequests.id, req.id));
      break;
    }
  }

  const updated = await getRequestById(req.id);
  return NextResponse.json(updated);
}
