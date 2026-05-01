import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listForUser, countUnread, markAllRead } from '@/lib/notifications';

export async function GET(_request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [items, unread] = await Promise.all([
    listForUser(session.user.id, 30),
    countUnread(session.user.id),
  ]);

  return NextResponse.json({ items, unread });
}

/** PATCH /api/notifications — mark all as read */
export async function PATCH(_request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await markAllRead(session.user.id);
  return NextResponse.json({ ok: true });
}
