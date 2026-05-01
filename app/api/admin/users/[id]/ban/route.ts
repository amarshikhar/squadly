import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, users, userAuditLog } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

const BanSchema = z.object({
  reason: z.string().min(1).max(500),
});

/** POST /api/admin/users/[id]/ban — ban a user */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  let actor: { userId: string };
  try {
    actor = await requireAdmin();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await request.json();
  const parse = BanSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  await db.update(users).set({ isBanned: true }).where(eq(users.id, params.id));
  await db.insert(userAuditLog).values({
    userId: params.id,
    action: 'banned',
    actorId: actor.userId,
    reason: parse.data.reason,
  });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/users/[id]/ban — unban */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  let actor: { userId: string };
  try {
    actor = await requireAdmin();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  await db.update(users).set({ isBanned: false }).where(eq(users.id, params.id));
  await db.insert(userAuditLog).values({
    userId: params.id,
    action: 'unbanned',
    actorId: actor.userId,
  });

  return NextResponse.json({ ok: true });
}
