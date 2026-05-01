/**
 * Notifications fan-out.
 *
 * - Inserts an in-app notification row (visible at /notifications + nav bell)
 * - Publishes a Pusher event to private-user-{id} for live UI update
 * - (Phase 3B) optionally enqueues a web push delivery
 */

import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db } from './db';
import { notifications, type Notification } from './db/schema';
import { publish, channels, events } from './pusher';

export type NotifType =
  | 'goal_funded'
  | 'goal_contribution_received'
  | 'request_pending'
  | 'request_accepted'
  | 'request_completed'
  | 'bid_outbid'
  | 'pass_won'
  | 'pass_lost'
  | 'message_received'
  | 'tier_promoted'
  | 'badge_awarded'
  | 'referral_redeemed'
  | 'system';

interface EmitOpts {
  userId: string;
  type: NotifType;
  title: string;
  body?: string;
  link?: string;
  actorId?: string;
  relatedId?: string;
}

/** Insert a notification row and broadcast it to the recipient via Pusher. */
export async function emit(opts: EmitOpts): Promise<Notification> {
  const [notif] = await db
    .insert(notifications)
    .values({
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      link: opts.link,
      actorId: opts.actorId,
      relatedId: opts.relatedId,
    })
    .returning();

  // Push to private user channel (optional — no-op if Pusher not configured)
  await publish(channels.user(opts.userId), 'notification.new', {
    id: notif.id,
    type: notif.type,
    title: notif.title,
    body: notif.body,
    link: notif.link,
    createdAt: notif.createdAt.toISOString(),
  });

  return notif;
}

/** Bulk-emit to multiple users (e.g. all goal contributors when goal funds). */
export async function emitMany(userIds: string[], shared: Omit<EmitOpts, 'userId'>) {
  if (!userIds.length) return [];
  const rows = await db
    .insert(notifications)
    .values(userIds.map((userId) => ({
      userId,
      type: shared.type,
      title: shared.title,
      body: shared.body,
      link: shared.link,
      actorId: shared.actorId,
      relatedId: shared.relatedId,
    })))
    .returning();

  await Promise.all(
    rows.map((n) =>
      publish(channels.user(n.userId), 'notification.new', {
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        createdAt: n.createdAt.toISOString(),
      }),
    ),
  );
  return rows;
}

/** List recent notifications for a user. */
export async function listForUser(userId: string, limit = 30) {
  return db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: [desc(notifications.createdAt)],
    limit,
  });
}

/** Count unread for the bell badge. */
export async function countUnread(userId: string): Promise<number> {
  const rows = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return Number(rows[0]?.c ?? 0);
}

/** Mark all unread for a user as read. */
export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
