/**
 * Razorpay X (RX) — bank payouts to creators in India.
 *
 * This is a separate API surface from the Razorpay payment gateway.
 * RX uses different keys and endpoints; configure them in `.env.local`:
 *
 *   RAZORPAYX_KEY_ID=<your_rx_key_id>
 *   RAZORPAYX_KEY_SECRET=<your_rx_key_secret>
 *   RAZORPAYX_ACCOUNT_NUMBER=<your_virtual_account_number>
 *
 * Flow:
 *   1. Creator adds bank/UPI details → we call createFundAccount() to register with RX
 *   2. Creator clicks Withdraw → we call createPayout() to transfer INR from our virtual account to theirs
 *   3. Webhook updates the transaction status (success / failed)
 */

const RX_BASE = 'https://api.razorpay.com/v1';

interface PayoutRequest {
  fundAccountId: string;
  amountPaise: number;
  notes?: Record<string, string>;
  referenceId: string;
  narration: string;
}

interface FundAccountUPI {
  contactId: string;
  vpa: string;
}

function authHeader(): string {
  const id = process.env.RAZORPAYX_KEY_ID ?? process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAYX_KEY_SECRET ?? process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error('Razorpay X keys missing');
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
}

/** Create or fetch a contact (creator's identity in Razorpay). */
export async function ensureContact(opts: { userId: string; name: string; email: string }) {
  const res = await fetch(`${RX_BASE}/contacts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: authHeader() },
    body: JSON.stringify({
      name: opts.name,
      email: opts.email,
      type: 'employee',
      reference_id: opts.userId,
    }),
  });
  if (!res.ok) throw new Error(`razorpay_contact: ${res.status}`);
  return res.json() as Promise<{ id: string }>;
}

/** Register a UPI fund account for a contact. */
export async function createFundAccountUPI(opts: FundAccountUPI) {
  const res = await fetch(`${RX_BASE}/fund_accounts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: authHeader() },
    body: JSON.stringify({
      contact_id: opts.contactId,
      account_type: 'vpa',
      vpa: { address: opts.vpa },
    }),
  });
  if (!res.ok) throw new Error(`razorpay_fund_account: ${res.status}`);
  return res.json() as Promise<{ id: string }>;
}

/** Register a bank account fund account (alternative to UPI). */
export async function createFundAccountBank(opts: {
  contactId: string;
  name: string;
  ifsc: string;
  accountNumber: string;
}) {
  const res = await fetch(`${RX_BASE}/fund_accounts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: authHeader() },
    body: JSON.stringify({
      contact_id: opts.contactId,
      account_type: 'bank_account',
      bank_account: {
        name: opts.name,
        ifsc: opts.ifsc,
        account_number: opts.accountNumber,
      },
    }),
  });
  if (!res.ok) throw new Error(`razorpay_fund_account: ${res.status}`);
  return res.json() as Promise<{ id: string }>;
}

/** Initiate a payout from our X virtual account to the creator's fund account. */
export async function createPayout(opts: PayoutRequest) {
  const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
  if (!accountNumber) throw new Error('RAZORPAYX_ACCOUNT_NUMBER not configured');

  const res = await fetch(`${RX_BASE}/payouts`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: authHeader(),
      // Idempotency to prevent double payouts on retry
      'X-Payout-Idempotency': opts.referenceId,
    },
    body: JSON.stringify({
      account_number: accountNumber,
      fund_account_id: opts.fundAccountId,
      amount: opts.amountPaise,
      currency: 'INR',
      mode: 'IMPS',
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: opts.referenceId,
      narration: opts.narration.slice(0, 30), // RX limits to 30 chars
      notes: opts.notes,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`razorpay_payout: ${res.status} ${err}`);
  }
  return res.json() as Promise<{ id: string; status: string; utr?: string }>;
}
