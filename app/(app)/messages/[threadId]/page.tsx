import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { eq, asc } from 'drizzle-orm';
import { Nav } from '@/components/squadly/nav';
import { db, messageThreads, messages, users } from '@/lib/db';
import { ChatView } from '@/components/squadly/chat-view';

export const dynamic = 'force-dynamic';

export default async function ThreadPage({ params }: { params: { threadId: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/signin?next=/messages/${params.threadId}`);

  const userId = session.user.id;
  const thread = await db.query.messageThreads.findFirst({
    where: eq(messageThreads.id, params.threadId),
  });
  if (!thread) notFound();
  if (thread.creatorId !== userId && thread.fanId !== userId) notFound();

  const counterpartId = thread.creatorId === userId ? thread.fanId : thread.creatorId;
  const counterpart = await db.query.users.findFirst({
    where: eq(users.id, counterpartId),
    columns: { id: true, handle: true, displayName: true, avatarUrl: true },
  });

  const initialMessages = await db.query.messages.findMany({
    where: eq(messages.threadId, thread.id),
    orderBy: [asc(messages.sentAt)],
    limit: 200,
  });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-12">
        <Link href="/messages" className="font-mono text-sm text-text-2 hover:text-neon-cyan">
          ← All conversations
        </Link>

        <div className="mt-6 flex items-center gap-4">
          <div className="h-14 w-14 overflow-hidden rounded-full border border-border-bright">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={counterpart?.avatarUrl ?? `https://i.pravatar.cc/100?u=${counterpartId}`}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h1 className="font-display text-2xl text-text-0">@{counterpart?.handle}</h1>
            <div className="font-mono text-xs uppercase tracking-widest text-text-3">
              Unlocked via {thread.unlockSource.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <ChatView
            threadId={thread.id}
            currentUserId={userId}
            initialMessages={initialMessages.map((m) => ({
              id: m.id,
              senderId: m.senderId,
              body: m.body,
              sentAt: m.sentAt.toISOString(),
            }))}
          />
        </div>
      </main>
    </div>
  );
}
