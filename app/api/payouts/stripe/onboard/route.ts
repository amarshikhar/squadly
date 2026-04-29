import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, providerProfiles } from '@/lib/db';
import { auth } from '@/lib/auth';
import { createConnectAccount, getConnectOnboardingLink } from '@/lib/payments/stripe';
import { APP_URL } from '@/lib/constants';

/**
 * POST /api/payouts/stripe/onboard
 *
 * Creates a Stripe Connect Express account for the creator (if missing) and
 * returns the hosted onboarding link. International creators only — Indian
 * creators should use Razorpay X via /api/payouts/withdraw.
 */
export async function POST(_request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = session.user.id;

  let profile = await db.query.providerProfiles.findFirst({
    where: eq(providerProfiles.userId, userId),
  });

  let stripeAccountId = profile?.stripeAccountId;

  if (!stripeAccountId) {
    const acct = await createConnectAccount({
      email: session.user.email ?? '',
      country: 'IN',
    });
    stripeAccountId = acct.id;

    if (profile) {
      await db
        .update(providerProfiles)
        .set({ stripeAccountId, payoutMethod: 'stripe_connect', payoutKycStatus: 'pending' })
        .where(eq(providerProfiles.userId, userId));
    } else {
      await db.insert(providerProfiles).values({
        userId,
        primaryGame: 'other',
        stripeAccountId,
        payoutMethod: 'stripe_connect',
        payoutKycStatus: 'pending',
      });
    }
  }

  const link = await getConnectOnboardingLink(stripeAccountId, `${APP_URL}/payouts?refresh=1`);
  return NextResponse.json({ accountId: stripeAccountId, url: link.url });
}
