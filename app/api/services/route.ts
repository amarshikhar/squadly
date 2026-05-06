import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, services } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

const CreateServiceSchema = z.object({
  type: z.enum(['coaching', 'duo', 'rank_push', 'lineup', 'crosshair_fix', 'hype_reel', 'custom']),
  game: z.enum(['bgmi', 'valorant', 'free_fire', 'dota2', 'cs2', 'cod_mobile', 'fortnite', 'mobile_legends', 'chess', 'other']),
  title: z.string().min(3).max(80),
  description: z.string().min(10).max(2000),
  priceInr: z.number().int().positive(),
  durationMin: z.number().int().positive(),
  deliveryWindowHours: z.number().int().positive().default(24),
});

/** GET /api/services — list all live services with filters */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const game = url.searchParams.get('game');
  const type = url.searchParams.get('type');

  // TODO: add filtering by game, type, search query, pagination
  const list = await db.query.services.findMany({
    where: eq(services.status, 'live'),
    limit: 50,
  });

  return NextResponse.json({ services: list });
}

/** POST /api/services — create a service (creator only) */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parse = CreateServiceSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parse.error.flatten() }, { status: 400 });
  }

  const [created] = await db
    .insert(services)
    .values({
      ...parse.data,
      creatorId: session.user.id,
      status: 'live',
    })
    .returning();

  return NextResponse.json({ service: created }, { status: 201 });
}
