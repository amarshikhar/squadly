import { NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { db, messageThreads, messages } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(_request: Request, { params }: { params: { threadId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const thread = await db.query.messageThreads.findFirst({
    where: eq(messageThreads.id, params.threadId),
  });
  if (!thread) return NextResponse.json({ error: 'thread_not_found' }, { status: 404 });
  if (thread.creatorId !== session.user.id && thread.fanId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const msgs = await db.query.messages.findMany({
    where: eq(messages.threadId, params.threadId),
    orderBy: [asc(messages.sentAt)],
    limit: 200,
  });

  return NextResponse.json({ thread, messages: msgs });
}
