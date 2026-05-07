import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, serviceRequests, disputes } from '@/lib/db';
import { auth } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { emit } from '@/lib/notifications';

const RaiseSchema = z.object({
  reason: z.string().min(10).max(4000),
});

/**
 * POST /api/requests/[id]/dispute
 * Buyer raises a dispute on a completed (or in_progress) request.
 * Holds payout until admin resolves.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rl = await rateLimit('dispute', session.user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'retry-after': String(rl.retryAfter) } },
    );
  }

  const body = await request.json();
  const parse = RaiseSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const req = await db.query.serviceRequests.findFirst({ where: eq(serviceRequests.id, params.id) });
  if (!req) return NextResponse.json({ error: 'request_not_found' }, { status: 404 });
  if (req.buyerId !== session.user.id) {
    return NextResponse.json({ error: 'only_buyer_can_dispute' }, { status: 403 });
  }
  if (!['accepted', 'in_progress', 'completed'].includes(req.status)) {
    return NextResponse.json({ error: 'request_not_disputable', status: req.status }, { status: 409 });
  }

  // Dispute insert + request status update must be atomic: a crash between them
  // would leave an open dispute while the request remains in a settleable state,
  // allowing the creator to complete and get paid despite an active dispute.
  try {
    const [dispute] = await db.transaction(async (tx) => {
      const [d] = await tx
        .insert(disputes)
        .values({
          requestId: req.id,
          raisedBy: session.user.id,
          creatorId: req.creatorId,
          buyerId: req.buyerId,
          reason: parse.data.reason,
          status: 'open',
        })
        .returning();

      await tx
        .update(serviceRequests)
        .set({ status: 'disputed' })
        .where(eq(serviceRequests.id, req.id));

      return [d];
    });

    await emit({
      userId: req.creatorId,
      type: 'system',
      title: 'A buyer disputed your service',
      body: 'Reply to the dispute. Your payout is held until admin resolves.',
      link: `/requests/${req.id}`,
      relatedId: dispute.id,
    });

    return NextResponse.json({ dispute }, { status: 201 });
  } catch (e: any) {
    if (String(e.message ?? '').includes('unique')) {
      return NextResponse.json({ error: 'already_disputed' }, { status: 409 });
    }
    throw e;
  }
}
