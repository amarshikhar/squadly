import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, desc, sql } from 'drizzle-orm';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isAdmin } from '@/lib/admin';
import { db, disputes, users, serviceRequests, services } from '@/lib/db';
import { ResolveDisputeForm } from '@/components/squadly/resolve-dispute-form';
import { formatInr } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function AdminDisputes() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/admin/disputes');
  if (!(await isAdmin(session.user.id))) redirect('/home');

  const rows = await db
    .select({
      dispute: disputes,
      service: { title: services.title },
      request: serviceRequests,
    })
    .from(disputes)
    .innerJoin(serviceRequests, eq(serviceRequests.id, disputes.requestId))
    .innerJoin(services, eq(services.id, serviceRequests.serviceId))
    .where(sql`${disputes.status} IN ('open', 'investigating')`)
    .orderBy(desc(disputes.createdAt))
    .limit(50);

  const userIds = Array.from(new Set(rows.flatMap((r) => [r.dispute.creatorId, r.dispute.buyerId])));
  const userRows = userIds.length
    ? await db.query.users.findMany({
        where: (u, { inArray }) => inArray(u.id, userIds),
        columns: { id: true, handle: true, displayName: true },
      })
    : [];
  const byId: Record<string, any> = {};
  userRows.forEach((u) => (byId[u.id] = u));

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Link href="/admin" className="font-mono text-sm text-text-2 hover:text-neon-cyan">
          ← Admin
        </Link>
        <h1 className="mt-6 font-display text-display-md text-text-0">Open disputes</h1>

        {rows.length === 0 ? (
          <Card className="mt-10 p-12 text-center text-text-3">
            <p className="font-mono text-sm">All clear. No open disputes.</p>
          </Card>
        ) : (
          <div className="mt-10 space-y-6">
            {rows.map(({ dispute: d, service, request }) => (
              <Card key={d.id} className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="magenta">{d.status}</Badge>
                      <span className="font-mono text-xs text-text-3">
                        opened {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-lg text-text-0">{service.title}</h3>
                    <div className="mt-1 font-mono text-xs text-text-2">
                      buyer @{byId[d.buyerId]?.handle ?? '?'} · creator @{byId[d.creatorId]?.handle ?? '?'} · {formatInr(request.priceInrPaid)}
                    </div>
                  </div>
                  <Link href={`/requests/${d.requestId}`} className="font-mono text-xs text-neon-cyan hover:underline">
                    View request →
                  </Link>
                </div>

                <div className="mt-5 rounded-lg border border-border bg-bg-2 p-4">
                  <div className="font-mono text-xs uppercase tracking-widest text-text-2 mb-2">Buyer reason</div>
                  <p className="text-sm text-text-1 whitespace-pre-line">{d.reason}</p>
                </div>

                <div className="mt-5">
                  <ResolveDisputeForm
                    disputeId={d.id}
                    priceInr={request.priceInrPaid}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
