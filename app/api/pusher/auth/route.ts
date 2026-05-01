import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { authorizeChannel } from '@/lib/pusher';
import { db, messageThreads } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * POST /api/pusher/auth
 * Authorizes private Pusher channel subscriptions.
 *   private-thread-{threadId} → only thread participants
 *   private-user-{userId}     → only that user
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await request.formData();
  const socketId = String(form.get('socket_id') ?? '');
  const channel = String(form.get('channel_name') ?? '');

  if (!socketId || !channel.startsWith('private-')) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  // Authorize private-user-{id}
  if (channel.startsWith('private-user-')) {
    const userId = channel.slice('private-user-'.length);
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  // Authorize private-thread-{id}
  if (channel.startsWith('private-thread-')) {
    const threadId = channel.slice('private-thread-'.length);
    const thread = await db.query.messageThreads.findFirst({
      where: eq(messageThreads.id, threadId),
    });
    if (!thread || (thread.creatorId !== session.user.id && thread.fanId !== session.user.id)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  try {
    const auth = authorizeChannel(socketId, channel);
    return NextResponse.json(auth);
  } catch {
    return NextResponse.json({ error: 'pusher_not_configured' }, { status: 500 });
  }
}
