import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { COIN_BUNDLES } from '@/lib/constants';

export default async function VaultPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin?next=/vault');

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● The Vault</Badge>
        <h1 className="mt-4 font-display text-display-lg text-text-0">Your Vault</h1>

        {/* Balances */}
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Card className="p-7">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">INR Balance</div>
            <div className="mt-2 font-display text-4xl text-neon-cyan glow-cyan-text">₹0</div>
            <Button variant="outline" size="sm" className="mt-4">Withdraw</Button>
          </Card>
          <Card className="p-7">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Coins</div>
            <div className="mt-2 font-display text-4xl text-neon-magenta glow-magenta-text">0</div>
            <Button variant="magenta" size="sm" className="mt-4">Top up</Button>
          </Card>
        </div>

        {/* Coin bundles */}
        <h2 className="mt-16 font-display text-2xl text-text-0">Top up coins</h2>
        <p className="mt-2 text-sm text-text-2">UPI · Cards · Net Banking via Razorpay</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {COIN_BUNDLES.map((b) => (
            <Card key={b.inr} className="p-5 text-center transition-all hover:border-border-bright hover:-translate-y-1 cursor-pointer">
              <div className="font-display text-3xl text-neon-magenta">{b.coins}</div>
              <div className="mt-1 font-mono text-xs uppercase text-text-2">coins</div>
              {b.bonus > 0 && (
                <div className="mt-2 font-mono text-xs text-neon-green">+{b.bonus} bonus</div>
              )}
              <div className="mt-4 border-t border-border pt-4 font-display text-xl text-text-0">₹{b.inr}</div>
            </Card>
          ))}
        </div>

        {/* Transactions */}
        <h2 className="mt-16 font-display text-2xl text-text-0">Transactions</h2>
        <Card className="mt-4 p-12 text-center text-text-3">
          <p className="font-mono text-sm">No transactions yet. Top up coins to get started.</p>
        </Card>
      </main>
    </div>
  );
}
