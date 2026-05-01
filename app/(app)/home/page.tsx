import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * The signed-in dashboard ("Streamer Hub" for creators / "Home" for fans).
 * Stub for now — Phase 1 builds out the real widgets.
 */
export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● Streamer Hub · Stub</Badge>
        <h1 className="mt-6 font-display text-display-lg text-text-0">
          Welcome back, {session.user.name?.split(' ')[0] ?? 'player'}.
        </h1>
        <p className="mt-3 max-w-xl text-text-2">
          Your dashboard lives here. Phase 1 builds out the real widgets: live Squad Goals,
          active Lobby Passes, recent requests, and Vault snapshot.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Card className="p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Vault Balance</div>
            <div className="mt-2 font-display text-3xl text-neon-cyan glow-cyan-text">₹0</div>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/vault">Open Vault</Link>
            </Button>
          </Card>

          <Card className="p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Active Goals</div>
            <div className="mt-2 font-display text-3xl text-text-0">0</div>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/goals">Create Goal</Link>
            </Button>
          </Card>

          <Card className="p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Pending Requests</div>
            <div className="mt-2 font-display text-3xl text-text-0">0</div>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/services">Manage Services</Link>
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
