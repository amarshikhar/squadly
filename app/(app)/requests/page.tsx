import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listRequestsForCreator, listRequestsForBuyer } from '@/lib/db/queries';
import { formatInr } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT: Record<string, 'default' | 'magenta' | 'green' | 'amber' | 'muted'> = {
  pending: 'amber',
  accepted: 'default',
  in_progress: 'default',
  completed: 'green',
  cancelled: 'muted',
  disputed: 'magenta',
};

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/requests');

  const [incoming, outgoing] = await Promise.all([
    listRequestsForCreator(session.user.id),
    listRequestsForBuyer(session.user.id),
  ]);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● Requests</Badge>
        <h1 className="mt-4 font-display text-display-lg text-text-0">Your requests</h1>

        <div className="mt-12 grid gap-12 lg:grid-cols-2">
          {/* Incoming */}
          <section>
            <h2 className="mb-5 font-display text-2xl text-text-0">
              Incoming <span className="text-text-3 text-base font-normal">· bookings on your services</span>
            </h2>
            {incoming.length === 0 ? (
              <Card className="p-8 text-center text-text-3">
                <p className="font-mono text-sm">No incoming requests yet.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {incoming.map(({ request: r, service, buyer }) => (
                  <Link key={r.id} href={`/requests/${r.id}`}>
                    <Card className="p-5 transition-colors hover:border-border-bright">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={STATUS_VARIANT[r.status]}>{r.status.replace('_', ' ')}</Badge>
                            <span className="font-mono text-xs text-text-3">
                              {formatDistanceToNow(new Date(r.requestedAt), { addSuffix: true })}
                            </span>
                          </div>
                          <h3 className="mt-2 font-display text-lg text-text-0">{service.title}</h3>
                          <div className="mt-1 font-mono text-xs text-text-2">from @{buyer.handle}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-xl text-neon-cyan">{formatInr(r.priceInrPaid)}</div>
                          <div className="mt-1 font-mono text-xs text-text-3">earn {formatInr(r.creatorPayoutInr)}</div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Outgoing */}
          <section>
            <h2 className="mb-5 font-display text-2xl text-text-0">
              Outgoing <span className="text-text-3 text-base font-normal">· services you booked</span>
            </h2>
            {outgoing.length === 0 ? (
              <Card className="p-8 text-center text-text-3">
                <p className="font-mono text-sm">No outgoing requests yet.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {outgoing.map(({ request: r, service, creator }) => (
                  <Link key={r.id} href={`/requests/${r.id}`}>
                    <Card className="p-5 transition-colors hover:border-border-bright">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={STATUS_VARIANT[r.status]}>{r.status.replace('_', ' ')}</Badge>
                            <span className="font-mono text-xs text-text-3">
                              {formatDistanceToNow(new Date(r.requestedAt), { addSuffix: true })}
                            </span>
                          </div>
                          <h3 className="mt-2 font-display text-lg text-text-0">{service.title}</h3>
                          <div className="mt-1 font-mono text-xs text-text-2">to @{creator.handle}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-xl text-neon-cyan">{formatInr(r.priceInrPaid)}</div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
