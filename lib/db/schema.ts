/**
 * Drizzle ORM schema for Squadly.
 * Mirrors db/schema.sql 1:1 — keep them in sync when changing tables.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  smallint,
  boolean,
  timestamp,
  numeric,
  jsonb,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const userRole = pgEnum('user_role', ['fan', 'creator', 'both']);
export const gameCode = pgEnum('game_code', [
  'bgmi', 'valorant', 'free_fire', 'dota2', 'cs2', 'cod_mobile', 'fortnite', 'mobile_legends', 'other',
]);
export const serviceType = pgEnum('service_type', [
  'coaching', 'duo', 'rank_push', 'lineup', 'crosshair_fix', 'hype_reel', 'custom',
]);
export const serviceStatus = pgEnum('service_status', ['draft', 'live', 'paused', 'archived']);
export const requestStatus = pgEnum('request_status', [
  'pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'disputed',
]);
export const transactionType = pgEnum('transaction_type', [
  'coin_purchase', 'service_payment', 'service_payout', 'tip', 'goal_contribution', 'lobby_pass_bid', 'refund', 'platform_fee',
]);
export const transactionStatus = pgEnum('transaction_status', ['pending', 'success', 'failed', 'refunded']);
export const goalStatus = pgEnum('goal_status', ['active', 'funded', 'expired', 'delivered', 'cancelled']);
export const rankTier = pgEnum('rank_tier', ['recruit', 'soldier', 'veteran', 'legend', 'commander']);
export const bidStatus = pgEnum('bid_status', ['active', 'outbid', 'winning', 'won', 'refunded']);
export const passStatus = pgEnum('pass_status', ['open', 'closed', 'fulfilled', 'cancelled']);

// ============================================================================
// USERS & PROFILES
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  handle: text('handle').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  role: userRole('role').notNull().default('fan'),
  isProvider: boolean('is_provider').notNull().default(false),
  isVerified: boolean('is_verified').notNull().default(false),
  isBanned: boolean('is_banned').notNull().default(false),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const providerProfiles = pgTable('provider_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  primaryGame: gameCode('primary_game').notNull(),
  discordId: text('discord_id'),
  discordUsername: text('discord_username'),
  instagramHandle: text('instagram_handle'),
  youtubeChannel: text('youtube_channel'),
  twitchChannel: text('twitch_channel'),
  payoutMethod: text('payout_method'),
  razorpayAccountId: text('razorpay_account_id'),
  stripeAccountId: text('stripe_account_id'),
  payoutKycStatus: text('payout_kyc_status'),
  avgRating: numeric('avg_rating', { precision: 3, scale: 2 }),
  totalCompleted: integer('total_completed').notNull().default(0),
  totalEarnedInr: integer('total_earned_inr').notNull().default(0),
  isPro: boolean('is_pro').notNull().default(false),
  proRenewedAt: timestamp('pro_renewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const gameRanks = pgTable('game_ranks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  game: gameCode('game').notNull(),
  rankLabel: text('rank_label').notNull(),
  inGameId: text('in_game_id'),
  proofUrl: text('proof_url'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verifiedVia: text('verified_via'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqUserGame: unique().on(t.userId, t.game),
}));

// ============================================================================
// SERVICES
// ============================================================================

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: serviceType('type').notNull(),
  game: gameCode('game').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  coverImageUrl: text('cover_image_url'),
  priceInr: integer('price_inr').notNull(),
  durationMin: integer('duration_min').notNull(),
  deliveryWindowHours: integer('delivery_window_hours').notNull().default(24),
  status: serviceStatus('status').notNull().default('draft'),
  isFeatured: boolean('is_featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byCreator: index('idx_services_creator').on(t.creatorId),
  byStatus: index('idx_services_status').on(t.status),
}));

export const serviceRequests = pgTable('service_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceId: uuid('service_id').notNull().references(() => services.id),
  creatorId: uuid('creator_id').notNull().references(() => users.id),
  buyerId: uuid('buyer_id').notNull().references(() => users.id),
  status: requestStatus('status').notNull().default('pending'),
  priceInrPaid: integer('price_inr_paid').notNull(),
  platformFeeInr: integer('platform_fee_inr').notNull(),
  creatorPayoutInr: integer('creator_payout_inr').notNull(),
  notes: text('notes'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelReason: text('cancel_reason'),
});

// ============================================================================
// VAULT
// ============================================================================

export const vaultBalances = pgTable('vault_balances', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  inrBalance: integer('inr_balance').notNull().default(0),
  coinBalance: integer('coin_balance').notNull().default(0),
  inrPending: integer('inr_pending').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  counterpartyId: uuid('counterparty_id').references(() => users.id),
  type: transactionType('type').notNull(),
  amountInr: integer('amount_inr').notNull().default(0),
  amountCoins: integer('amount_coins').notNull().default(0),
  status: transactionStatus('status').notNull().default('pending'),
  relatedRequestId: uuid('related_request_id').references(() => serviceRequests.id),
  relatedGoalId: uuid('related_goal_id'),
  relatedBidId: uuid('related_bid_id'),
  gateway: text('gateway'),
  gatewayRef: text('gateway_ref'),
  gatewayPayload: jsonb('gateway_payload'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  settledAt: timestamp('settled_at', { withTimezone: true }),
});

export const coinPurchases = pgTable('coin_purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  coins: integer('coins').notNull(),
  inrPaid: integer('inr_paid').notNull(),
  gateway: text('gateway').notNull(),
  gatewayRef: text('gateway_ref').notNull().unique(),
  status: transactionStatus('status').notNull().default('pending'),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  settledAt: timestamp('settled_at', { withTimezone: true }),
});

// ============================================================================
// SQUAD GOALS
// ============================================================================

export const squadGoals = pgTable('squad_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  targetCoins: integer('target_coins').notNull(),
  currentCoins: integer('current_coins').notNull().default(0),
  contributorsCount: integer('contributors_count').notNull().default(0),
  status: goalStatus('status').notNull().default('active'),
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  fundedAt: timestamp('funded_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  deliveryProofUrl: text('delivery_proof_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const squadGoalContributions = pgTable('squad_goal_contributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  goalId: uuid('goal_id').notNull().references(() => squadGoals.id, { onDelete: 'cascade' }),
  fanId: uuid('fan_id').notNull().references(() => users.id),
  coins: integer('coins').notNull(),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id),
  contributedAt: timestamp('contributed_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// SQUAD RANKS
// ============================================================================

export const squadRanks = pgTable('squad_ranks', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fanId: uuid('fan_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  totalCoinsSpent: integer('total_coins_spent').notNull().default(0),
  periodCoinsSpent: integer('period_coins_spent').notNull().default(0),
  currentTier: rankTier('current_tier').notNull().default('recruit'),
  rankPosition: integer('rank_position'),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
  periodStartedAt: timestamp('period_started_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqCreatorFan: unique().on(t.creatorId, t.fanId),
}));

// ============================================================================
// LOBBY PASS
// ============================================================================

export const lobbyPasses = pgTable('lobby_passes', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  game: gameCode('game').notNull(),
  slotCount: integer('slot_count').notNull(),
  minBidCoins: integer('min_bid_coins').notNull().default(100),
  bidIncrementCoins: integer('bid_increment_coins').notNull().default(50),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  status: passStatus('status').notNull().default('open'),
  sessionAt: timestamp('session_at', { withTimezone: true }).notNull(),
  sessionDurationMin: integer('session_duration_min').notNull(),
  fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const lobbyPassBids = pgTable('lobby_pass_bids', {
  id: uuid('id').primaryKey().defaultRandom(),
  passId: uuid('pass_id').notNull().references(() => lobbyPasses.id, { onDelete: 'cascade' }),
  bidderId: uuid('bidder_id').notNull().references(() => users.id),
  coinAmount: integer('coin_amount').notNull(),
  status: bidStatus('status').notNull().default('active'),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  bidAt: timestamp('bid_at', { withTimezone: true }).notNull().defaultNow(),
  wonAt: timestamp('won_at', { withTimezone: true }),
  refundedAt: timestamp('refunded_at', { withTimezone: true }),
});

// ============================================================================
// SOCIAL
// ============================================================================

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').notNull().unique().references(() => serviceRequests.id),
  creatorId: uuid('creator_id').notNull().references(() => users.id),
  reviewerId: uuid('reviewer_id').notNull().references(() => users.id),
  rating: smallint('rating').notNull(),
  body: text('body'),
  isHidden: boolean('is_hidden').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messageThreads = pgTable('message_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => users.id),
  fanId: uuid('fan_id').notNull().references(() => users.id),
  unlockSource: text('unlock_source').notNull(),
  unlockRefId: uuid('unlock_ref_id'),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqCreatorFan: unique().on(t.creatorId, t.fanId),
}));

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id').notNull().references(() => messageThreads.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  isFlagged: boolean('is_flagged').notNull().default(false),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ProviderProfile = typeof providerProfiles.$inferSelect;
export type Service = typeof services.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type SquadGoal = typeof squadGoals.$inferSelect;
export type SquadRank = typeof squadRanks.$inferSelect;
export type LobbyPass = typeof lobbyPasses.$inferSelect;
export type LobbyPassBid = typeof lobbyPassBids.$inferSelect;
export type Review = typeof reviews.$inferSelect;
