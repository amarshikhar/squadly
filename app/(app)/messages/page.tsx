import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, or, desc } from 'drizzle-orm';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db, messageThreads, users } from '@/lib/db';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/messages');

  const userId = session.user.id;

  const rows = await db
    .select({ thread: messageThreads })
    .from(messageThreads)
    .where(or(eq(messageThreads.creatorId, userId), eq(messageThreads.fanId, userId)))
    .orderBy(desc(messageThreads.lastMessageAt))
    .limit(100);

  const counterpartIds = rows.map((r) =>
    r.thread.creatorId === userId ? r.thread.fanId : r.thread.creatorId,
  );
  const counterparts = counterpartIds.length
    ? await db.query.users.findMany({
        where: (u, { inArray }) => inArray(u.id, counterpartIds),
        columns: { id: true, handle: true, displayName: true, avatarUrl: true },
      })
    : [];
  const cpMap: Record<string, any> = {};
  counterparts.forEach((c) => (cpMap[c.id] = c));

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● Messages</Badge>
        <h1 className="mt-4 font-display text-display-lg text-text-0">Direct messages</h1>
        <p className="mt-3 max-w-xl text-text-2">
          Threads unlock automatically after a service request, won Lobby Pass, or Commander tier reach.
        </p>

        {rows.length === 0 ? (
          <Card className="mt-10 p-12 text-center text-text-3">
            <p className="font-mono text-sm">No conversations yet.</p>
          </Card>
        ) : (
          <div className="mt-10 space-y-3">
            {rows.map(({ thread }) => {
              const cpId = thread.creatorId === userId ? thread.fanId : thread.creatorId;
              const cp = cpMap[cpId];
              return (
                <Link key={thread.id} href={`/messages/${thread.id}`}>
                  <Card className="flex items-center gap-4 p-4 transition-colors hover:border-border-bright">
                    <div className="h-12 w-12 overflow-hidden rounded-full border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cp?.avatarUrl ?? `https://i.pravatar.cc/100?u=${cpId}`} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="font-mono text-sm text-text-0">@{cp?.handle ?? '?'}</div>
                      <div className="font-mono text-[11px] uppercase tracking-widest text-text-3">
                        Unlocked via {thread.unlockSource.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div className="font-mono text-xs text-text-3">
                      {thread.lastMessageAt
                        ? formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })
                        : 'no messages'}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
