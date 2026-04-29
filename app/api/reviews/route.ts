import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, reviews, serviceRequests, providerProfiles } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, and, sql } from 'drizzle-orm';

const ReviewSchema = z.object({
  requestId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
});

/**
 * POST /api/reviews
 * Buyer submits a review after a completed service request.
 * Updates the creator's avg_rating + total_completed counters.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  const parse = ReviewSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const req = await db.query.serviceRequests.findFirst({
    where: eq(serviceRequests.id, parse.data.requestId),
  });
  if (!req) return NextResponse.json({ error: 'request_not_found' }, { status: 404 });
  if (req.buyerId !== session.user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (req.status !== 'completed') return NextResponse.json({ error: 'request_not_completed' }, { status: 409 });

  // Check duplicate
  const existing = await db.query.reviews.findFirst({
    where: eq(reviews.requestId, req.id),
  });
  if (existing) return NextResponse.json({ error: 'already_reviewed' }, { status: 409 });

  return db.transaction(async (tx) => {
    const [review] = await tx
      .insert(reviews)
      .values({
        requestId: req.id,
        creatorId: req.creatorId,
        reviewerId: session.user.id,
        rating: parse.data.rating,
        body: parse.data.body,
      })
      .returning();

    // Recalculate creator's avg rating from all reviews
    const stats = await tx
      .select({
        avgRating: sql<number>`AVG(${reviews.rating})::numeric(3,2)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(and(eq(reviews.creatorId, req.creatorId), eq(reviews.isHidden, false)));

    await tx
      .update(providerProfiles)
      .set({
        avgRating: String(stats[0].avgRating ?? 0),
        totalCompleted: sql`${providerProfiles.totalCompleted} + 1`,
      })
      .where(eq(providerProfiles.userId, req.creatorId));

    return NextResponse.json({ review }, { status: 201 });
  });
}
