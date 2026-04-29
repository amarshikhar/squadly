import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, squadGoals } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

const CreateGoalSchema = z.object({
  title: z.string().min(5).max(140),
  description: z.string().max(2000).optional(),
  targetCoins: z.number().int().positive(),
  deadlineHoursFromNow: z.number().int().positive().max(72),
});

/** GET /api/goals — active goals (optionally for one creator) */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const creatorId = url.searchParams.get('creator_id');

  const list = await db.query.squadGoals.findMany({
    where: creatorId ? eq(squadGoals.creatorId, creatorId) : eq(squadGoals.status, 'active'),
    limit: 50,
    orderBy: (g, { desc }) => [desc(g.createdAt)],
  });

  return NextResponse.json({ goals: list });
}

/** POST /api/goals — creator creates a new goal */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parse = CreateGoalSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parse.error.flatten() }, { status: 400 });
  }

  const deadline = new Date(Date.now() + parse.data.deadlineHoursFromNow * 60 * 60 * 1000);

  const [created] = await db
    .insert(squadGoals)
    .values({
      creatorId: session.user.id,
      title: parse.data.title,
      description: parse.data.description,
      targetCoins: parse.data.targetCoins,
      deadline,
      status: 'active',
    })
    .returning();

  return NextResponse.json({ goal: created }, { status: 201 });
}
