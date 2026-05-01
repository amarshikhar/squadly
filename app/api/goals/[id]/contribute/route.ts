import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { contributeToGoal } from '@/lib/ledger';
import { getGoalById } from '@/lib/db/queries';
import { publish, channels, events } from '@/lib/pusher';

const ContributeSchema = z.object({
  coins: z.number().int().min(1).max(50000),
});

/**
 * POST /api/goals/[id]/contribute
 * Fan contributes coins toward a creator's Squad Goal.
 *
 * Atomic: validates active + not expired, debits fan vault, inserts contribution row,
 * increments goal totals, upserts squad_rank, marks goal funded if threshold met.
 *
 * Pusher: broadcasts goal.contribution + goal.funded events.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  const parse = ContributeSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const before = await getGoalById(params.id);
  if (!before) return NextResponse.json({ error: 'goal_not_found' }, { status: 404 });

  if (before.goal.creatorId === session.user.id) {
    return NextResponse.json({ error: 'cannot_contribute_to_own_goal' }, { status: 400 });
  }

  try {
    const result = await contributeToGoal({
      fanId: session.user.id,
      goalId: params.id,
      coins: parse.data.coins,
    });

    // Broadcast realtime updates
    const ch = channels.goal(params.id);
    await publish(ch, events.GOAL_CONTRIBUTION, {
      goalId: params.id,
      currentCoins: result.goal?.currentCoins,
      contributorsCount: result.goal?.contributorsCount,
      contributedCoins: parse.data.coins,
      fanHandle: session.user.name ?? 'a fan',
    });

    if (result.goal?.status === 'funded') {
      await publish(ch, events.GOAL_FUNDED, { goalId: params.id });
    }

    return NextResponse.json({ goal: result.goal, transactionId: result.transactionId });
  } catch (e: any) {
    if (e.message === 'insufficient_coins') {
      return NextResponse.json({ error: 'insufficient_coins' }, { status: 402 });
    }
    if (e.message === 'goal_not_active' || e.message === 'goal_expired') {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    throw e;
  }
}
