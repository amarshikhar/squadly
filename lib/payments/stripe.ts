/**
 * Stripe Connect client.
 * Used for international fan checkout + creator payouts to non-Indian creators.
 *
 * Lazy-initialised for consistency with Razorpay/Pusher and as defense for
 * future SDK versions that might validate the key at construction time.
 * Stripe currently accepts empty strings without throwing, but applying the
 * same lazy pattern means missing env vars no longer cause module-load
 * failures during Next.js's "Collecting page data" build step.
 */
import Stripe from 'stripe';

let _stripe: Stripe | null = null;
let warned = false;

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key && !warned) {
    console.warn('[stripe] Missing STRIPE_SECRET_KEY — Stripe payments disabled');
    warned = true;
  }
  _stripe = new Stripe(key ?? '', {
    apiVersion: '2024-06-20',
    typescript: true,
  });
  return _stripe;
}

/**
 * Public `stripe` instance — proxied to the lazy getter. External callers
 * (e.g. `app/api/webhooks/stripe/route.ts`) that do `stripe.webhooks.constructEvent(...)`
 * keep working; the underlying Stripe client only constructs on first use.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const real = getStripe();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

/** Create Stripe Connect Express account for a creator */
export async function createConnectAccount(opts: { email: string; country?: string }) {
  return getStripe().accounts.create({
    type: 'express',
    country: opts.country ?? 'IN',
    email: opts.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
}

/** Get the onboarding link for a Connect account */
export async function getConnectOnboardingLink(accountId: string, returnUrl: string) {
  return getStripe().accountLinks.create({
    account: accountId,
    refresh_url: returnUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
}

/** Create a payment intent with application fee (split payment) */
export async function createMarketplacePaymentIntent(opts: {
  amountInr: number;            // paise
  applicationFeeInr: number;    // platform commission in paise
  destinationAccountId: string;
  metadata?: Record<string, string>;
}) {
  return getStripe().paymentIntents.create({
    amount: opts.amountInr,
    currency: 'inr',
    application_fee_amount: opts.applicationFeeInr,
    transfer_data: { destination: opts.destinationAccountId },
    metadata: opts.metadata,
  });
}
