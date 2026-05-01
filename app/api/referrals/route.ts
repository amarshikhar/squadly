import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getOrCreateCode } from '@/lib/referrals';

/** GET /api/referrals — get/create my active code */
export async function GET(_request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ref = await getOrCreateCode(session.user.id);
  return NextResponse.json({ code: ref.code, expiresAt: ref.expiresAt, status: ref.status });
}
