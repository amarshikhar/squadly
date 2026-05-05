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
    // Lock the outer chrome to viewport height so only the chat list inside scrolls.
    // Nav is sticky h-16, so the chat area is `100dvh - 4rem`.
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <Nav />

      <main className="flex min-h-0 flex-1 flex-col px-4 pt-4 sm:px-6 sm:pt-6">
        <Link href="/messages" className="font-mono text-sm text-text-2 hover:text-neon-cyan">
          ← All conversations
        </Link>

        <div className="mt-4 flex flex-shrink-0 items-center gap-4 border-b border-border pb-4">
          {/* Avatar + handle = clickable profile link. Subtle hover affordance
              so users can tell it's interactive without it screaming. */}
          <Link
            href={`/${counterpart?.handle ?? ''}`}
            className="group flex items-center gap-4 transition-opacity hover:opacity-90"
            aria-label={`Open @${counterpart?.handle ?? ''}'s profile`}
          >
            <div className="h-12 w-12 overflow-hidden rounded-full border border-border-bright">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={counterpart?.avatarUrl ?? `https://i.pravatar.cc/100?u=${counterpartId}`}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl text-text-0 transition-colors group-hover:text-neon-cyan">
                @{counterpart?.handle}
              </h1>
              <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">
                View profile →
              </div>
            </div>
          </Link>
          <div className="ml-auto font-mono text-[11px] uppercase tracking-widest text-text-3">
            Unlocked via {thread.unlockSource.replace(/_/g, ' ')}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 py-4">
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
