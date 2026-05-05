import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, or, desc, and, inArray } from 'drizzle-orm';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db, messageThreads, users, serviceRequests, services } from '@/lib/db';
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

  // Fetch all service requests between current user and any counterpart, in either direction.
  // Group by counterpart id so we can render service chips per thread.
  type SvcChip = { id: string; title: string; status: string; role: 'buyer' | 'seller' };
  const servicesByCounterpart: Record<string, SvcChip[]> = {};
  if (counterpartIds.length) {
    const svcRows = await db
      .select({
        request: serviceRequests,
        service: { id: services.id, title: services.title },
      })
      .from(serviceRequests)
      .innerJoin(services, eq(services.id, serviceRequests.serviceId))
      .where(
        or(
          and(eq(serviceRequests.creatorId, userId), inArray(serviceRequests.buyerId, counterpartIds)),
          and(eq(serviceRequests.buyerId, userId), inArray(serviceRequests.creatorId, counterpartIds)),
        ),
      )
      .orderBy(desc(serviceRequests.requestedAt));

    for (const row of svcRows) {
      const cpId = row.request.creatorId === userId ? row.request.buyerId : row.request.creatorId;
      const role: 'buyer' | 'seller' = row.request.creatorId === userId ? 'seller' : 'buyer';
      (servicesByCounterpart[cpId] ??= []).push({
        id: row.service.id,
        title: row.service.title,
        status: row.request.status,
        role,
      });
    }
  }

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
              const svcs = servicesByCounterpart[cpId] ?? [];
              const visibleSvcs = svcs.slice(0, 3);
              const extraCount = svcs.length - visibleSvcs.length;
              return (
                // Card is no longer a single Link wrapper — we split it into two
                // hit zones so the avatar/handle goes to the user's profile and
                // the rest of the card opens the thread. Nested <a>'s aren't
                // valid HTML, so this restructure is necessary.
                <Card key={thread.id} className="p-4 transition-colors hover:border-border-bright">
                  <div className="flex items-center gap-4">
                    {/* Profile zone — avatar + handle → /[handle] */}
                    <Link
                      href={`/${cp?.handle ?? ''}`}
                      className="flex flex-shrink-0 items-center gap-3 transition-opacity hover:opacity-80"
                      aria-label={`Open @${cp?.handle ?? ''}'s profile`}
                    >
                      <div className="h-12 w-12 overflow-hidden rounded-full border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cp?.avatarUrl ?? `https://i.pravatar.cc/100?u=${cpId}`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="font-mono text-sm text-text-0 hover:text-neon-cyan">
                        @{cp?.handle ?? '?'}
                      </div>
                    </Link>

                    {/* Thread zone — fills remaining space, opens the chat */}
                    <Link
                      href={`/messages/${thread.id}`}
                      className="flex flex-1 items-center justify-end gap-3 self-stretch text-text-2 transition-colors hover:text-neon-cyan"
                      aria-label="Open conversation"
                    >
                      <span className="hidden font-mono text-[11px] uppercase tracking-widest text-text-3 sm:inline">
                        Unlocked via {thread.unlockSource.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-xs text-text-3">
                        {thread.lastMessageAt
                          ? formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })
                          : 'no messages'}
                      </span>
                      <span className="font-mono text-xs">Open →</span>
                    </Link>
                  </div>
                  {svcs.length > 0 && (
                    <Link
                      href={`/messages/${thread.id}`}
                      className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 transition-colors hover:text-neon-cyan"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-widest text-text-3">
                        Services
                      </span>
                      {visibleSvcs.map((s, i) => (
                        <span
                          key={`${s.id}-${i}`}
                          className="rounded-full border border-border bg-bg-2 px-2.5 py-0.5 font-mono text-[11px] text-text-2"
                          title={`${s.role === 'buyer' ? 'Bought' : 'Sold'} · ${s.status}`}
                        >
                          <span className={s.role === 'buyer' ? 'text-neon-cyan' : 'text-neon-magenta'}>
                            {s.role === 'buyer' ? '↓' : '↑'}
                          </span>{' '}
                          {s.title}
                        </span>
                      ))}
                      {extraCount > 0 && (
                        <span className="font-mono text-[11px] text-text-3">+{extraCount} more</span>
                      )}
                    </Link>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
