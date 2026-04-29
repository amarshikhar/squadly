import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getVaultBalance,
  listActiveGoals,
  listRequestsForCreator,
  listCreatorServices,
} from '@/lib/db/queries';
import { formatInr, formatCoins } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/home');

  const userId = session.user.id;

  const [vault, myGoals, myRequests, myServices] = await Promise.all([
    getVaultBalance(userId),
    listActiveGoals(userId),
    listRequestsForCreator(userId),
    listCreatorServices(userId),
  ]);

  const pendingCount = myRequests.filter((r) => r.request.status === 'pending').length;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● Streamer Hub</Badge>
        <h1 className="mt-6 font-display text-display-lg text-text-0">
          Welcome back, {session.user.name?.split(' ')[0] ?? 'player'}.
        </h1>
        <p className="mt-3 max-w-xl text-text-2">
          Here&apos;s what&apos;s happening on your squad today.
        </p>

        {/* KPI row */}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Card className="p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Vault — INR</div>
            <div className="mt-2 font-display text-3xl text-neon-cyan glow-cyan-text">
              {formatInr(vault.inrBalance)}
            </div>
            <div className="mt-2 font-mono text-xs text-text-3">{formatCoins(vault.coinBalance)} coins</div>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/vault">Open Vault →</Link>
            </Button>
          </Card>

          <Card className="p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Active Squad Goals</div>
            <div className="mt-2 font-display text-3xl text-text-0">{myGoals.length}</div>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/goals">Manage goals →</Link>
            </Button>
          </Card>

          <Card className="p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Pending Requests</div>
            <div className="mt-2 font-display text-3xl text-text-0">{pendingCount}</div>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/requests">Review requests →</Link>
            </Button>
          </Card>
        </div>

        {/* Services */}
        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl text-text-0">Your services</h2>
            <Button asChild size="sm">
              <Link href="/services/create">+ New service</Link>
            </Button>
          </div>

          {myServices.length === 0 ? (
            <Card className="p-10 text-center text-text-3">
              <p className="font-mono text-sm">No services yet. List your first to start earning.</p>
              <Button asChild className="mt-5">
                <Link href="/services/create">Create your first service</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myServices.map((s) => (
                <Card key={s.id} className="p-5">
                  <Badge variant={s.status === 'live' ? 'green' : 'muted'}>{s.status}</Badge>
                  <h3 className="mt-3 font-display text-lg text-text-0">{s.title}</h3>
                  <div className="mt-1 font-mono text-xs text-text-2">{s.durationMin} min</div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="font-display text-xl text-neon-cyan">{formatInr(s.priceInr)}</div>
                    <Link href={`/services/${s.id}`} className="font-mono text-xs text-text-2 hover:text-neon-cyan">
                      View →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
