import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, users, userAuditLog } from '@/lib/db';
import { auth } from '@/lib/auth';

const ConsentSchema = z.object({
  termsVersion: z.string().min(4).max(20),
  privacyVersion: z.string().min(4).max(20),
});

/**
 * POST /api/profile/consent
 * Records that the user has accepted the current ToS + Privacy Policy.
 * Versions are date-stamped strings (e.g. "2026-05-01") so we can re-prompt on updates.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  const parse = ConsentSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  await db
    .update(users)
    .set({
      consentTermsV: parse.data.termsVersion,
      consentPrivacyV: parse.data.privacyVersion,
      consentRecordedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  await db.insert(userAuditLog).values({
    userId: session.user.id,
    action: 'consent_recorded',
    metadata: parse.data,
  });

  return NextResponse.json({ ok: true });
}
