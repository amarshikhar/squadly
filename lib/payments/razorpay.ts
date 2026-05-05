/**
 * Razorpay client + helpers.
 * Razorpay is the primary gateway for INR/UPI payments in India.
 *
 * Lazy-initialised: `new Razorpay({key_id: '', ...})` throws "key_id is mandatory",
 * which would crash the build's "Collecting page data" pass on environments
 * without Razorpay keys (e.g. Vercel preview). So we defer construction until
 * the first call. Same pattern as `lib/pusher.ts` and `lib/rate-limit.ts`.
 */
import Razorpay from 'razorpay';
import crypto from 'crypto';

let _razorpay: Razorpay | null = null;
let warned = false;

function getRazorpay(): Razorpay {
  if (_razorpay) return _razorpay;
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) {
    if (!warned) {
      console.warn('[razorpay] Missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET — payments will not work');
      warned = true;
    }
    throw new Error('Razorpay keys are not configured');
  }
  _razorpay = new Razorpay({ key_id: id, key_secret: secret });
  return _razorpay;
}

/**
 * Public `razorpay` instance — proxied to the lazy getter. External callers
 * that already do `razorpay.orders.create(...)` keep working; the underlying
 * Razorpay client only constructs on first use, never at module load.
 */
export const razorpay = new Proxy({} as Razorpay, {
  get(_target, prop, receiver) {
    const real = getRazorpay();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

/** Create a Razorpay order for INR amount (in paise) */
export async function createOrder(opts: {
  amountInr: number;        // paise
  receipt: string;
  notes?: Record<string, string>;
}) {
  return getRazorpay().orders.create({
    amount: opts.amountInr,
    currency: 'INR',
    receipt: opts.receipt,
    notes: opts.notes,
  });
}

/** Verify Razorpay webhook signature */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/** Verify a payment signature from the client (after Razorpay Checkout) */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
