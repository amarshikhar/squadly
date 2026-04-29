/**
 * Razorpay client + helpers.
 * Razorpay is the primary gateway for INR/UPI payments in India.
 */
import Razorpay from 'razorpay';
import crypto from 'crypto';

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('[razorpay] Missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET — payments will not work');
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID ?? '',
  key_secret: process.env.RAZORPAY_KEY_SECRET ?? '',
});

/** Create a Razorpay order for INR amount (in paise) */
export async function createOrder(opts: {
  amountInr: number;        // paise
  receipt: string;
  notes?: Record<string, string>;
}) {
  return razorpay.orders.create({
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
