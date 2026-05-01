/**
 * Pusher client — browser-side subscriber.
 *
 * If Pusher isn't configured (no NEXT_PUBLIC_PUSHER_KEY), all subscribe()
 * calls return a no-op unsubscribe function and the UI falls back to whatever
 * the server-rendered initial state was. Components that subscribe SHOULD
 * also poll for fresh data periodically as a fallback.
 */

import PusherJs from 'pusher-js';

let pusher: PusherJs | null = null;

function getClient(): PusherJs | null {
  if (typeof window === 'undefined') return null;
  if (pusher) return pusher;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;

  pusher = new PusherJs(key, {
    cluster,
    forceTLS: true,
    authEndpoint: '/api/pusher/auth',
  });
  return pusher;
}

// ----- Event types -----

export interface GoalContributionEvent {
  goalId: string;
  currentCoins: number;
  contributorsCount: number;
  contributedCoins: number;
  fanHandle: string;
}

export interface GoalFundedEvent { goalId: string }

export interface BidPlacedEvent {
  passId: string;
  topAmount: number;
  topBidderHandle: string;
  bidderCount: number;
}

export interface PassClosedEvent {
  passId: string;
  winners: { handle: string; amount: number }[];
}

export interface MessageSentEvent {
  threadId: string;
  messageId: string;
  senderId: string;
  body: string;
  sentAt: string;
}

// ----- Subscriptions -----

export function subscribeToGoal(
  goalId: string,
  handlers: { onContribution?: (e: GoalContributionEvent) => void; onFunded?: (e: GoalFundedEvent) => void },
): () => void {
  const c = getClient();
  if (!c) return () => {};
  const ch = c.subscribe(`goal-${goalId}`);
  if (handlers.onContribution) ch.bind('goal.contribution', handlers.onContribution);
  if (handlers.onFunded) ch.bind('goal.funded', handlers.onFunded);
  return () => c.unsubscribe(`goal-${goalId}`);
}

export function subscribeToPass(
  passId: string,
  handlers: { onBid?: (e: BidPlacedEvent) => void; onClose?: (e: PassClosedEvent) => void },
): () => void {
  const c = getClient();
  if (!c) return () => {};
  const ch = c.subscribe(`pass-${passId}`);
  if (handlers.onBid) ch.bind('pass.bid.placed', handlers.onBid);
  if (handlers.onClose) ch.bind('pass.closed', handlers.onClose);
  return () => c.unsubscribe(`pass-${passId}`);
}

export function subscribeToThread(
  threadId: string,
  onMessage: (e: MessageSentEvent) => void,
): () => void {
  const c = getClient();
  if (!c) return () => {};
  const channel = `private-thread-${threadId}`;
  const ch = c.subscribe(channel);
  ch.bind('message.sent', onMessage);
  return () => c.unsubscribe(channel);
}
