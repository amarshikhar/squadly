/**
 * Pusher Channels — server-side publisher.
 *
 * If PUSHER credentials aren't configured, all `publish()` calls become no-ops
 * so the app still works without realtime. Clients should fall back to polling.
 *
 * Channel naming convention:
 *   goal-{goalId}              — squad goal progress + contributors
 *   pass-{passId}              — lobby pass bid leaderboard
 *   thread-{threadId}          — DM messages (private channel; auth required)
 *   user-{userId}              — per-user notifications (private channel)
 */

import Pusher from 'pusher';

let pusher: Pusher | null = null;

function getClient(): Pusher | null {
  if (pusher) return pusher;
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!appId || !key || !secret || !cluster) {
    return null;
  }
  pusher = new Pusher({ appId, key, secret, cluster, useTLS: true });
  return pusher;
}

/** Publish an event to a Pusher channel. No-op if Pusher not configured. */
export async function publish(channel: string, event: string, data: unknown) {
  const client = getClient();
  if (!client) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[pusher] (no-op) ${channel} ${event}`, data);
    }
    return;
  }
  try {
    await client.trigger(channel, event, data);
  } catch (e) {
    console.error('[pusher] publish failed', e);
  }
}

/** Authorize a private channel subscription (used by /api/pusher/auth). */
export function authorizeChannel(socketId: string, channel: string) {
  const client = getClient();
  if (!client) throw new Error('pusher_not_configured');
  return client.authorizeChannel(socketId, channel);
}

export const channels = {
  goal: (goalId: string) => `goal-${goalId}`,
  pass: (passId: string) => `pass-${passId}`,
  thread: (threadId: string) => `private-thread-${threadId}`,
  user: (userId: string) => `private-user-${userId}`,
};

export const events = {
  GOAL_CONTRIBUTION: 'goal.contribution',
  GOAL_FUNDED: 'goal.funded',
  PASS_BID_PLACED: 'pass.bid.placed',
  PASS_CLOSED: 'pass.closed',
  MESSAGE_SENT: 'message.sent',
  TIER_PROMOTED: 'tier.promoted',
} as const;
