import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db, disputes, serviceRequests, transactions, vaultBalances } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { ensureVault } from '@/lib/ledger';
import { emit } from '@/lib/notifications';

const ResolveSchema = z.object({
  resolution: z.enum(['resolved_creator', 'resolved_buyer', 'resolved_partial', 'cancelled']),
  note: z.string().max(2000).optional(),
  refundInr: z.number().int().nonnegative().optional(), // paise; only relevant for buyer/partial
});

/**
 * PATCH /api/admin/disputes/[id]/resolve
 * Admin resolves a dispute and (optionally) issues a refund.
 *
 * Resolutions:
 *  - resolved_creator: no refund; release creator payout (request → completed if not already)
 *  - resolved_buyer: full refund to buyer; reverse creator payout if already settled
 *  - resolved_partial: partial refund (refundInr required); split with creator
 *  - cancelled: dispute withdrawn (no money movement; request goes back to prior state)
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  let actor: { userId: string };
  try {
    actor = await requireAdmin();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await request.json();
  const parse = ResolveSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const dispute = await db.query.disputes.findFirst({ where: eq(disputes.id, params.id) });
  if (!dispute) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (dispute.status !== 'open' && dispute.status !== 'investigating') {
    return NextResponse.json({ error: 'already_resolved', current: dispute.status }, { status: 409 });
  }

  const req = await db.query.serviceRequests.findFirst({ where: eq(serviceRequests.id, dispute.requestId) });
  if (!req) return NextResponse.json({ error: 'request_not_found' }, { status: 404 });

  await db.transaction(async (tx) => {
    // 1. Update the dispute row
    await tx
      .update(disputes)
      .set({
        status: parse.data.resolution,
        resolvedBy: actor.userId,
        resolutionNote: parse.data.note,
        refundInr: parse.data.refundInr,
        resolvedAt: new Date(),
      })
      .where(eq(disputes.id, dispute.id));

    // 2. Move money based on resolution
    if (parse.data.resolution === 'resolved_buyer' || parse.data.resolution === 'resolved_partial') {
      const refundAmount = parse.data.resolution === 'resolved_buyer' ? req.priceInrPaid : (parse.data.refundInr ?? 0);

      if (refundAmount > 0) {
        // Reverse creator's vault credit if it was already settled (request was completed)
        if (req.status === 'disputed' || req.status === 'completed') {
          // Best-effort: reduce creator vault by min(refundAmount, current creator credit on this request)
          // For simplicity: reduce by full refundAmount * (creator share / price)
          const creatorShare = Math.round((refundAmount * req.creatorPayoutInr) / req.priceInrPaid);
          await ensureVault(req.creatorId, tx);
          await tx
            .update(vaultBalances)
            .set({ inrBalance: sql`GREATEST(0, ${vaultBalances.inrBalance} - ${creatorShare})` })
            .where(eq(vaultBalances.userId, req.creatorId));

          await tx.insert(transactions).values({
            userId: req.creatorId,
            type: 'refund',
            amountInr: -creatorShare,
            status: 'success',
            relatedRequestId: req.id,
            gateway: 'internal',
            description: `Dispute refund (creator clawback) — dispute ${dispute.id}`,
            settledAt: new Date(),
          });
        }

        // Issue refund to buyer (gateway refund — actual gateway call deferred to webhook reconciliation)
        await tx.insert(transactions).values({
          userId: req.buyerId,
          type: 'refund',
          amountInr: refundAmount,
          status: 'pending',
          relatedRequestId: req.id,
          gateway: 'razorpay',
          description: `Dispute refund — dispute ${dispute.id}`,
        });
      }

      // Update request status accordingly
      await tx
        .update(serviceRequests)
        .set({ status: 'cancelled', cancelledAt: new Date(), cancelReason: `dispute_${parse.data.resolution}` })
        .where(eq(serviceRequests.id, req.id));
    } else if (parse.data.resolution === 'resolved_creator') {
      // No refund; restore request to completed if it was disputed
      if (req.status === 'disputed') {
        await tx
          .update(serviceRequests)
          .set({ status: 'completed', completedAt: req.completedAt ?? new Date() })
          .where(eq(serviceRequests.id, req.id));
      }
    } else if (parse.data.resolution === 'cancelled') {
      // Dispute withdrawn; revert request to its prior state
      if (req.status === 'disputed') {
        await tx
          .update(serviceRequests)
          .set({ status: req.completedAt ? 'completed' : 'in_progress' })
          .where(eq(serviceRequests.id, req.id));
      }
    }
  });

  // Notify both parties
  await Promise.all([
    emit({
      userId: dispute.buyerId,
      type: 'system',
      title: `Dispute resolved: ${parse.data.resolution.replace('_', ' ')}`,
      body: parse.data.note?.slice(0, 200) ?? 'Admin resolved your dispute.',
      link: `/requests/${dispute.requestId}`,
      relatedId: dispute.id,
    }),
    emit({
      userId: dispute.creatorId,
      type: 'system',
      title: `Dispute resolved: ${parse.data.resolution.replace('_', ' ')}`,
      body: parse.data.note?.slice(0, 200) ?? 'Admin resolved the dispute.',
      link: `/requests/${dispute.requestId}`,
      relatedId: dispute.id,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
