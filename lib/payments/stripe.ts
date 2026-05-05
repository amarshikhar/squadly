/**
 * Stripe Connect client.
 * Used for international fan checkout + creator payouts to non-Indian creators.
 *
 * Eager init is safe here: `new Stripe('')` does not throw — Stripe SDK only
 * fails when you make an actual API call without a valid key. So this module
 * imports cleanly even when STRIPE_SECRET_KEY isn't set in the build env.
 */
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[stripe] Missing STRIPE_SECRET_KEY — Stripe payments disabled');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-06-20',
  typescript: true,
});

/** Create Stripe Connect Express account for a creator */
export async function createConnectAccount(opts: { email: string; country?: string }) {
  return stripe.accounts.create({
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
  return stripe.accountLinks.create({
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
  return stripe.paymentIntents.create({
    amount: opts.amountInr,
    currency: 'inr',
    application_fee_amount: opts.applicationFeeInr,
    transfer_data: { destination: opts.destinationAccountId },
    metadata: opts.metadata,
  });
}
