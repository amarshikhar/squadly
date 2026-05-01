import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, or, and, desc } from 'drizzle-orm';
import { db, messageThreads, messages, users } from '@/lib/db';
import { auth } from '@/lib/auth';
import { publish, channels, events } from '@/lib/pusher';

const PostSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

/** GET /api/messages — list user's threads */
export async function GET(_request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = session.user.id;
  const threads = await db
    .select({ thread: messageThreads })
    .from(messageThreads)
    .where(or(eq(messageThreads.creatorId, userId), eq(messageThreads.fanId, userId)))
    .orderBy(desc(messageThreads.lastMessageAt))
    .limit(50);

  // Hydrate counterpart user info
  const counterpartIds = threads.map((t) =>
    t.thread.creatorId === userId ? t.thread.fanId : t.thread.creatorId,
  );
  const counterparts = counterpartIds.length
    ? await db.query.users.findMany({
        where: (u, { inArray }) => inArray(u.id, counterpartIds),
        columns: { id: true, handle: true, displayName: true, avatarUrl: true },
      })
    : [];
  const map: Record<string, any> = {};
  counterparts.forEach((c) => (map[c.id] = c));

  return NextResponse.json({
    threads: threads.map((t) => ({
      ...t.thread,
      counterpart: map[t.thread.creatorId === userId ? t.thread.fanId : t.thread.creatorId] ?? null,
    })),
  });
}

/** POST /api/messages — send a message in an existing thread */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  const parse = PostSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const thread = await db.query.messageThreads.findFirst({
    where: eq(messageThreads.id, parse.data.threadId),
  });
  if (!thread) return NextResponse.json({ error: 'thread_not_found' }, { status: 404 });
  if (thread.creatorId !== session.user.id && thread.fanId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const [msg] = await db
    .insert(messages)
    .values({
      threadId: thread.id,
      senderId: session.user.id,
      body: parse.data.body,
    })
    .returning();

  await db
    .update(messageThreads)
    .set({ lastMessageAt: new Date() })
    .where(eq(messageThreads.id, thread.id));

  await publish(channels.thread(thread.id), events.MESSAGE_SENT, {
    threadId: thread.id,
    messageId: msg.id,
    senderId: session.user.id,
    body: msg.body,
    sentAt: msg.sentAt.toISOString(),
  });

  return NextResponse.json({ message: msg }, { status: 201 });
}
