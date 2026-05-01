import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ReferralCard } from '@/components/squadly/referral-card';
import { RedeemForm } from '@/components/squadly/redeem-form';
import { getOrCreateCode } from '@/lib/referrals';
import { db, referrals } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function ReferralsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/referrals');

  const code = await getOrCreateCode(session.user.id);

  // Has the user already redeemed someone else's code?
  const myRedemption = await db.query.referrals.findFirst({
    where: eq(referrals.redeemedBy, session.user.id),
  });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge variant="green">● Referrals</Badge>
        <h1 className="mt-4 font-display text-display-md text-text-0">Bring your squad</h1>
        <p className="mt-3 max-w-xl text-text-2">
          Share your code. When a new player signs up and makes their first paid action, you both get
          <span className="text-neon-green"> +{code.referrerRewardCoins} coins</span>.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <ReferralCard code={code.code} expiresAt={code.expiresAt.toISOString()} reward={code.referrerRewardCoins} />

          <Card className="p-7">
            <h2 className="font-display text-xl text-text-0">Got a code?</h2>
            {myRedemption ? (
              <p className="mt-4 text-sm text-text-1">
                You&apos;ve already redeemed code{' '}
                <span className="font-mono text-neon-cyan">{myRedemption.code}</span> ·{' '}
                <span className="text-text-2">{myRedemption.status}</span>
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-text-2">
                  Enter your friend&apos;s code to claim your welcome bonus.
                </p>
                <div className="mt-6">
                  <RedeemForm />
                </div>
              </>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
