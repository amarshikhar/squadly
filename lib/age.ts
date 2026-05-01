/**
 * Age verification helper. Stores only year-of-birth (privacy minimization).
 * Treats anyone <18 as blocked from money-moving actions.
 */
import { eq } from 'drizzle-orm';
import { db, users } from './db';

export interface AgeStatus {
  is18Plus: boolean;
  verifiedAt: Date | null;
}

export async function getAgeStatus(userId: string): Promise<AgeStatus> {
  const u = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { is18Plus: true, ageVerifiedAt: true },
  });
  return {
    is18Plus: Boolean(u?.is18Plus),
    verifiedAt: u?.ageVerifiedAt ?? null,
  };
}

export function isAgeGated(action: 'coin_purchase' | 'bid' | 'withdraw' | 'service_book') {
  // Money-moving actions require 18+
  return ['coin_purchase', 'bid', 'withdraw'].includes(action);
}

/** Throws a Response if user fails age check for the given action. */
export async function requireAge(userId: string): Promise<void> {
  const status = await getAgeStatus(userId);
  if (!status.is18Plus) {
    throw new Response(
      JSON.stringify({
        error: 'age_verification_required',
        message: 'You must verify you are 18+ before this action.',
        link: '/profile/age',
      }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    );
  }
}

/** Compute age from year of birth (rough — no birthday accuracy needed). */
export function ageFromYear(year: number): number {
  return new Date().getUTCFullYear() - year;
}
