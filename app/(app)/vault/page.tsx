import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CoinBundles } from '@/components/squadly/coin-bundles';
import { getVaultBalance, listTransactions } from '@/lib/db/queries';
import { formatInr, formatCoins } from '@/lib/utils';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

const TX_LABEL: Record<string, string> = {
  coin_purchase: 'Coin top-up',
  service_payment: 'Service paid',
  service_payout: 'Service payout',
  tip: 'Tip',
  goal_contribution: 'Goal contribution',
  lobby_pass_bid: 'Lobby Pass bid',
  refund: 'Refund',
  platform_fee: 'Platform fee',
};

export default async function VaultPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/vault');

  const [vault, txns] = await Promise.all([
    getVaultBalance(session.user.id),
    listTransactions(session.user.id, 30),
  ]);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● The Vault</Badge>
        <h1 className="mt-4 font-display text-display-lg text-text-0">Your Vault</h1>

        {/* Balance — coins only. INR isn't held in the vault: service payments
            settle via Stripe directly to the creator's bank, so showing an
            INR balance here was misleading. Withdrawable INR lives on the
            Payouts page. */}
        <div className="mt-10">
          <Card className="p-7">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Coins</div>
            <div className="mt-2 font-display text-5xl text-neon-magenta glow-magenta-text">
              {formatCoins(vault.coinBalance)}
            </div>
            <div className="mt-2 font-mono text-xs text-text-3">
              Spend on Squad Goals · Lobby Pass · Tips
            </div>
          </Card>
        </div>

        {/* Coin top-up bundles */}
        <h2 className="mt-16 font-display text-2xl text-text-0">Top up coins</h2>
        <p className="mt-2 text-sm text-text-2">UPI · Cards · Net Banking via Razorpay</p>
        <CoinBundles className="mt-6" />

        {/* Transactions */}
        <h2 className="mt-16 font-display text-2xl text-text-0">Transactions</h2>
        {txns.length === 0 ? (
          <Card className="mt-4 p-12 text-center text-text-3">
            <p className="font-mono text-sm">No transactions yet. Top up coins to get started.</p>
          </Card>
        ) : (
          <Card className="mt-4 overflow-hidden">
            <div className="divide-y divide-border">
              {txns.map((tx) => {
                const inr = tx.amountInr ?? 0;
                const coins = tx.amountCoins ?? 0;
                return (
                  <div key={tx.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <div className="font-mono text-sm text-text-0">{TX_LABEL[tx.type] ?? tx.type}</div>
                      <div className="font-mono text-[11px] text-text-3 uppercase tracking-widest">
                        {format(new Date(tx.createdAt), 'dd MMM HH:mm')} · {tx.status}
                      </div>
                    </div>
                    <div className="text-right font-mono text-sm">
                      {inr !== 0 && (
                        <div className={inr > 0 ? 'text-neon-green' : 'text-text-1'}>
                          {inr > 0 ? '+' : ''}{formatInr(inr)}
                        </div>
                      )}
                      {coins !== 0 && (
                        <div className={coins > 0 ? 'text-neon-cyan' : 'text-neon-magenta'}>
                          {coins > 0 ? '+' : ''}{formatCoins(coins)} coins
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
