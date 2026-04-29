import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db, providerProfiles, vaultBalances } from '@/lib/db';
import { formatInr } from '@/lib/utils';
import { WithdrawForm } from '@/components/squadly/withdraw-form';
import { StripeConnectButton } from '@/components/squadly/stripe-connect-button';

export const dynamic = 'force-dynamic';

export default async function PayoutsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/payouts');

  const [vault, profile] = await Promise.all([
    db.query.vaultBalances.findFirst({ where: eq(vaultBalances.userId, session.user.id) }),
    db.query.providerProfiles.findFirst({ where: eq(providerProfiles.userId, session.user.id) }),
  ]);

  const balance = vault?.inrBalance ?? 0;
  const hasStripe = !!profile?.stripeAccountId;
  const stripeStatus = profile?.payoutKycStatus ?? 'not_started';

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● Payouts</Badge>
        <h1 className="mt-4 font-display text-display-md text-text-0">Withdraw your earnings</h1>
        <p className="mt-3 max-w-xl text-text-2">
          India creators: instant UPI via Razorpay X · International creators: weekly bank transfers via Stripe Connect.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* India · Razorpay X UPI */}
          <Card className="p-7">
            <div className="flex items-center justify-between">
              <Badge variant="default">India · UPI</Badge>
              <span className="font-mono text-xs text-text-3">Instant · IMPS</span>
            </div>
            <h2 className="mt-4 font-display text-2xl text-text-0">Withdraw to UPI</h2>
            <p className="mt-2 text-sm text-text-2">
              Available balance: <span className="font-mono text-neon-cyan">{formatInr(balance)}</span>
            </p>
            <div className="mt-6">
              <WithdrawForm availableInr={balance} />
            </div>
          </Card>

          {/* International · Stripe Connect */}
          <Card className="p-7">
            <div className="flex items-center justify-between">
              <Badge variant="magenta">International</Badge>
              <span className="font-mono text-xs text-text-3">Weekly · ACH/SEPA</span>
            </div>
            <h2 className="mt-4 font-display text-2xl text-text-0">Stripe Connect</h2>

            {!hasStripe && (
              <>
                <p className="mt-2 text-sm text-text-2">
                  Onboard with Stripe to receive payouts in 30+ countries. Takes ~5 minutes.
                </p>
                <StripeConnectButton className="mt-6" />
              </>
            )}

            {hasStripe && stripeStatus === 'pending' && (
              <>
                <p className="mt-2 text-sm text-neon-amber">
                  KYC pending. Complete onboarding to enable payouts.
                </p>
                <StripeConnectButton className="mt-6" label="Continue onboarding" />
              </>
            )}

            {hasStripe && stripeStatus === 'verified' && (
              <>
                <p className="mt-2 text-sm text-neon-green">
                  ✓ KYC verified. Payouts run weekly automatically.
                </p>
                <p className="mt-4 font-mono text-xs text-text-3">
                  Account: {profile?.stripeAccountId}
                </p>
              </>
            )}

            {hasStripe && stripeStatus === 'rejected' && (
              <p className="mt-4 text-sm text-neon-magenta">
                KYC rejected. Contact support.
              </p>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
