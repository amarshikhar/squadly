import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listForUser, markAllRead } from '@/lib/notifications';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/notifications');

  const items = await listForUser(session.user.id, 50);
  // Mark all as read on open (server action could be cleaner, but this is simple)
  await markAllRead(session.user.id);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● Notifications</Badge>
        <h1 className="mt-4 font-display text-display-md text-text-0">Activity</h1>

        {items.length === 0 ? (
          <Card className="mt-10 p-12 text-center text-text-3">
            <p className="font-mono text-sm">No notifications yet. Make some noise.</p>
          </Card>
        ) : (
          <div className="mt-10 space-y-2">
            {items.map((n) => {
              const inner = (
                <Card className={`p-4 transition-colors hover:border-border-bright ${!n.readAt ? 'border-border-bright bg-neon-cyan/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    {!n.readAt && <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neon-cyan" />}
                    <div className="flex-1">
                      <p className="font-medium text-text-0">{n.title}</p>
                      {n.body && <p className="mt-1 text-sm text-text-1">{n.body}</p>}
                      <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-text-3">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })} · {n.type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                </Card>
              );
              return n.link ? (
                <Link key={n.id} href={n.link}>
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
