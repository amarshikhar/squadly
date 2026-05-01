import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { redeem, ReferralError } from '@/lib/referrals';

const RedeemSchema = z.object({
  code: z.string().min(4).max(16),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  const parse = RedeemSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  try {
    const ref = await redeem(parse.data.code, session.user.id);
    return NextResponse.json({
      ok: true,
      pendingReward: ref.redeemerRewardCoins,
      message: `Code accepted. Make your first paid action to earn ${ref.redeemerRewardCoins} coins.`,
    });
  } catch (e) {
    if (e instanceof ReferralError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    }
    throw e;
  }
}
