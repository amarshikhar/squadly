import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/payments/stripe';
import { db, providerProfiles } from '@/lib/db';

/**
 * POST /api/webhooks/stripe
 * Verifies signature and reacts to:
 *   - account.updated → mark creator's KYC status verified/rejected
 *   - payout.paid     → mark transaction settled (Phase 2 — reconcile payouts)
 *
 * Configure endpoint URL in Stripe Dashboard → Developers → Webhooks.
 */
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: 'config' }, { status: 500 });

  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e: any) {
    return NextResponse.json({ error: 'invalid_signature', message: e.message }, { status: 400 });
  }

  console.info('[stripe webhook]', event.type);

  switch (event.type) {
    case 'account.updated': {
      const acct: any = event.data.object;
      const status = acct.charges_enabled && acct.payouts_enabled ? 'verified' : 'pending';
      await db
        .update(providerProfiles)
        .set({ payoutKycStatus: status })
        .where(eq(providerProfiles.stripeAccountId, acct.id));
      break;
    }

    // TODO Phase 2: payout.paid, payout.failed, transfer.created
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
