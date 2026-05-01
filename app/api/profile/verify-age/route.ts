import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, users, userAuditLog } from '@/lib/db';
import { auth } from '@/lib/auth';
import { ageFromYear } from '@/lib/age';

const VerifySchema = z.object({
  dobYear: z.number().int().min(1900).max(new Date().getUTCFullYear()),
  confirm: z.literal(true),
});

/**
 * POST /api/profile/verify-age
 * Self-attestation flow: user confirms birth year and that they're 18+.
 * Lightweight by design — full ID verification is a future Phase 4B add-on for high-value flows.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  const parse = VerifySchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const age = ageFromYear(parse.data.dobYear);
  if (age < 18) {
    // Record the failed attempt for audit but don't grant access
    await db.insert(userAuditLog).values({
      userId: session.user.id,
      action: 'age_verification_denied',
      reason: `dob_year=${parse.data.dobYear} (age=${age})`,
    });
    return NextResponse.json({
      error: 'underage',
      message: 'Squadly requires you to be 18 or older to spend or receive money on the platform.',
    }, { status: 403 });
  }

  await db
    .update(users)
    .set({
      is18Plus: true,
      ageVerifiedAt: new Date(),
      dobYear: parse.data.dobYear,
    })
    .where(eq(users.id, session.user.id));

  await db.insert(userAuditLog).values({
    userId: session.user.id,
    action: 'age_verified',
    metadata: { dob_year: parse.data.dobYear, age },
  });

  return NextResponse.json({ ok: true, is18Plus: true });
}
