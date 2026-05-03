/**
 * Typed query helpers for Squadly.
 * Centralizes Drizzle queries used across pages and API routes.
 */
import { eq, and, or, desc, asc, sql, gt, gte, lt, inArray, ilike } from 'drizzle-orm';
import { db } from './index';
import {
  users,
  providerProfiles,
  gameRanks,
  services,
  serviceRequests,
  squadGoals,
  squadGoalContributions,
  squadRanks,
  lobbyPasses,
  lobbyPassBids,
  reviews,
  vaultBalances,
  transactions,
} from './schema';

// ============================================================================
// USERS
// ============================================================================

/** Get a user by handle (case-insensitive). Returns null if not found or banned. */
export async function getUserByHandle(handle: string) {
  const row = await db.query.users.findFirst({
    where: and(eq(users.handle, handle), eq(users.isBanned, false)),
  });
  return row ?? null;
}

/** Get a creator's full public profile (user + provider extension + ranks). */
export async function getCreatorProfile(handle: string) {
  const user = await getUserByHandle(handle);
  if (!user) return null;

  const [profile, ranks] = await Promise.all([
    db.query.providerProfiles.findFirst({ where: eq(providerProfiles.userId, user.id) }),
    db.query.gameRanks.findMany({ where: eq(gameRanks.userId, user.id) }),
  ]);

  return { user, profile: profile ?? null, ranks };
}

// ============================================================================
// SERVICES
// ============================================================================

export interface ServiceFilters {
  game?: string;
  type?: string;
  creatorId?: string;
  status?: 'draft' | 'live' | 'paused' | 'archived';
  search?: string;
  minPriceInr?: number;          // paise
  maxPriceInr?: number;          // paise
  minRating?: number;            // 1-5
  verifiedOnly?: boolean;
  limit?: number;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'rating';
  since?: Date;                  // only services created after this timestamp
}

export async function listServices(filters: ServiceFilters = {}) {
  const conditions = [eq(services.status, filters.status ?? 'live')];
  if (filters.game) conditions.push(eq(services.game, filters.game as any));
  if (filters.type) conditions.push(eq(services.type, filters.type as any));
  if (filters.creatorId) conditions.push(eq(services.creatorId, filters.creatorId));
  if (filters.search) {
    conditions.push(
      sql`(${services.title} ILIKE ${'%' + filters.search + '%'} OR ${services.description} ILIKE ${'%' + filters.search + '%'})`,
    );
  }
  if (filters.minPriceInr !== undefined) conditions.push(sql`${services.priceInr} >= ${filters.minPriceInr}`);
  if (filters.maxPriceInr !== undefined) conditions.push(sql`${services.priceInr} <= ${filters.maxPriceInr}`);
  if (filters.verifiedOnly) conditions.push(eq(users.isVerified, true));
  if (filters.since) conditions.push(gte(services.createdAt, filters.since));

  let q = db
    .select({
      service: services,
      creator: {
        id: users.id,
        handle: users.handle,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        isVerified: users.isVerified,
      },
    })
    .from(services)
    .innerJoin(users, eq(users.id, services.creatorId))
    .where(and(...conditions));

  // Sorting
  switch (filters.sort) {
    case 'price_asc':
      q = q.orderBy(asc(services.priceInr)) as any;
      break;
    case 'price_desc':
      q = q.orderBy(desc(services.priceInr)) as any;
      break;
    case 'rating':
      // Featured first, then recent — true rating sort needs join to provider_profiles
      q = q.orderBy(desc(services.isFeatured), desc(services.createdAt)) as any;
      break;
    case 'recent':
      // Pure freshness — ignore featured boost
      q = q.orderBy(desc(services.createdAt)) as any;
      break;
    default:
      q = q.orderBy(desc(services.isFeatured), desc(services.createdAt)) as any;
  }

  return q.limit(filters.limit ?? 50);
}

export async function getServiceById(id: string) {
  const rows = await db
    .select({
      service: services,
      creator: {
        id: users.id,
        handle: users.handle,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        isVerified: users.isVerified,
      },
    })
    .from(services)
    .innerJoin(users, eq(users.id, services.creatorId))
    .where(eq(services.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listCreatorServices(creatorId: string) {
  return db.query.services.findMany({
    where: and(eq(services.creatorId, creatorId), eq(services.status, 'live')),
    orderBy: [asc(services.sortOrder), desc(services.createdAt)],
  });
}

// ============================================================================
// REQUESTS
// ============================================================================

export async function listRequestsForCreator(creatorId: string) {
  return db
    .select({
      request: serviceRequests,
      service: services,
      buyer: {
        id: users.id,
        handle: users.handle,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(serviceRequests)
    .innerJoin(services, eq(services.id, serviceRequests.serviceId))
    .innerJoin(users, eq(users.id, serviceRequests.buyerId))
    .where(eq(serviceRequests.creatorId, creatorId))
    .orderBy(desc(serviceRequests.requestedAt))
    .limit(100);
}

export async function listRequestsForBuyer(buyerId: string) {
  return db
    .select({
      request: serviceRequests,
      service: services,
      creator: {
        id: users.id,
        handle: users.handle,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(serviceRequests)
    .innerJoin(services, eq(services.id, serviceRequests.serviceId))
    .innerJoin(users, eq(users.id, serviceRequests.creatorId))
    .where(eq(serviceRequests.buyerId, buyerId))
    .orderBy(desc(serviceRequests.requestedAt))
    .limit(100);
}

export async function getRequestById(id: string) {
  const rows = await db
    .select({
      request: serviceRequests,
      service: services,
      creator: { id: users.id, handle: users.handle, displayName: users.displayName, avatarUrl: users.avatarUrl },
    })
    .from(serviceRequests)
    .innerJoin(services, eq(services.id, serviceRequests.serviceId))
    .innerJoin(users, eq(users.id, serviceRequests.creatorId))
    .where(eq(serviceRequests.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ============================================================================
// GOALS
// ============================================================================

export async function listActiveGoals(creatorId?: string) {
  const conditions = [eq(squadGoals.status, 'active'), gt(squadGoals.deadline, new Date())];
  if (creatorId) conditions.push(eq(squadGoals.creatorId, creatorId));

  return db
    .select({
      goal: squadGoals,
      creator: {
        id: users.id,
        handle: users.handle,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(squadGoals)
    .innerJoin(users, eq(users.id, squadGoals.creatorId))
    .where(and(...conditions))
    .orderBy(desc(squadGoals.createdAt))
    .limit(50);
}

export async function getGoalById(id: string) {
  const rows = await db
    .select({
      goal: squadGoals,
      creator: { id: users.id, handle: users.handle, displayName: users.displayName, avatarUrl: users.avatarUrl },
    })
    .from(squadGoals)
    .innerJoin(users, eq(users.id, squadGoals.creatorId))
    .where(eq(squadGoals.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Goals the user has contributed coins to, with aggregated total per goal. */
export async function listMyGoalContributions(fanId: string, limit = 20) {
  return db
    .select({
      goalId: squadGoals.id,
      goalTitle: squadGoals.title,
      goalStatus: squadGoals.status,
      goalDeadline: squadGoals.deadline,
      goalTargetCoins: squadGoals.targetCoins,
      goalCurrentCoins: squadGoals.currentCoins,
      myCoins: sql<number>`SUM(${squadGoalContributions.coins})`.as('my_coins'),
      lastContributedAt: sql<Date>`MAX(${squadGoalContributions.contributedAt})`.as('last_contributed_at'),
      creator: {
        id: users.id,
        handle: users.handle,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(squadGoalContributions)
    .innerJoin(squadGoals, eq(squadGoals.id, squadGoalContributions.goalId))
    .innerJoin(users, eq(users.id, squadGoals.creatorId))
    .where(eq(squadGoalContributions.fanId, fanId))
    .groupBy(squadGoals.id, users.id)
    .orderBy(desc(sql`MAX(${squadGoalContributions.contributedAt})`))
    .limit(limit);
}

// ============================================================================
// SQUAD RANKS / TOP FANS
// ============================================================================

export async function getTopFansForCreator(creatorId: string, limit = 10) {
  return db
    .select({
      rank: squadRanks,
      fan: { id: users.id, handle: users.handle, displayName: users.displayName, avatarUrl: users.avatarUrl },
    })
    .from(squadRanks)
    .innerJoin(users, eq(users.id, squadRanks.fanId))
    .where(eq(squadRanks.creatorId, creatorId))
    .orderBy(desc(squadRanks.periodCoinsSpent))
    .limit(limit);
}

// ============================================================================
// VAULT
// ============================================================================

export async function getVaultBalance(userId: string) {
  const row = await db.query.vaultBalances.findFirst({ where: eq(vaultBalances.userId, userId) });
  return row ?? { userId, inrBalance: 0, coinBalance: 0, inrPending: 0, updatedAt: new Date() };
}

export async function listTransactions(userId: string, limit = 50) {
  return db.query.transactions.findMany({
    where: or(eq(transactions.userId, userId), eq(transactions.counterpartyId, userId)),
    orderBy: [desc(transactions.createdAt)],
    limit,
  });
}

// ============================================================================
// REVIEWS
// ============================================================================

export async function listReviewsForCreator(creatorId: string, limit = 20) {
  return db
    .select({
      review: reviews,
      reviewer: { id: users.id, handle: users.handle, displayName: users.displayName, avatarUrl: users.avatarUrl },
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.reviewerId))
    .where(and(eq(reviews.creatorId, creatorId), eq(reviews.isHidden, false)))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

// ============================================================================
// LOBBY PASSES (open / by creator)
// ============================================================================

export async function listOpenPasses(opts: { creatorId?: string; limit?: number; game?: string } = {}) {
  const conds = [eq(lobbyPasses.status, 'open'), gt(lobbyPasses.endsAt, new Date())];
  if (opts.creatorId) conds.push(eq(lobbyPasses.creatorId, opts.creatorId));
  if (opts.game) conds.push(eq(lobbyPasses.game, opts.game as any));

  return db
    .select({
      pass: lobbyPasses,
      creator: { id: users.id, handle: users.handle, displayName: users.displayName, avatarUrl: users.avatarUrl },
    })
    .from(lobbyPasses)
    .innerJoin(users, eq(users.id, lobbyPasses.creatorId))
    .where(and(...conds))
    .orderBy(desc(lobbyPasses.createdAt))
    .limit(opts.limit ?? 50);
}

// ============================================================================
// GLOBAL SEARCH — users + services + goals + passes
// Matches by entity text (title/description/handle/name) AND game label,
// so "Free Fire" surfaces all free_fire services even if their titles don't
// literally contain that string.
// ============================================================================

import { GAME_LABELS } from '../utils';

export async function searchAll(query: string, limit = 8) {
  if (!query || query.trim().length < 2) {
    return { users: [], services: [], goals: [], passes: [] };
  }
  const q = `%${query.trim()}%`;
  const lc = query.trim().toLowerCase();

  // Match game enum codes if the query (e.g. "Free Fire", "valorant", "BGMI")
  // is a substring of any game label.
  const matchingGameCodes = Object.entries(GAME_LABELS)
    .filter(([, label]) => label.toLowerCase().includes(lc))
    .map(([code]) => code);
  const gameMatch = matchingGameCodes.length > 0;

  const [matchUsers, matchServices, matchGoals, matchPasses] = await Promise.all([
    // Users — by handle or display name
    db.query.users.findMany({
      where: and(
        eq(users.isBanned, false),
        or(ilike(users.handle, q), ilike(users.displayName, q)),
      ),
      columns: { id: true, handle: true, displayName: true, avatarUrl: true, isVerified: true, isProvider: true },
      limit,
    }),
    // Services — by title, description, OR matching game label
    db
      .select({
        service: services,
        creator: { id: users.id, handle: users.handle, displayName: users.displayName },
      })
      .from(services)
      .innerJoin(users, eq(users.id, services.creatorId))
      .where(and(
        eq(services.status, 'live'),
        gameMatch
          ? or(
              ilike(services.title, q),
              ilike(services.description, q),
              inArray(services.game, matchingGameCodes as any),
            )
          : or(ilike(services.title, q), ilike(services.description, q)),
      ))
      .limit(limit),
    // Goals — by title (no game column on goals to match)
    db
      .select({
        goal: squadGoals,
        creator: { id: users.id, handle: users.handle, displayName: users.displayName },
      })
      .from(squadGoals)
      .innerJoin(users, eq(users.id, squadGoals.creatorId))
      .where(and(eq(squadGoals.status, 'active'), ilike(squadGoals.title, q)))
      .limit(limit),
    // Passes — by title OR matching game label
    db
      .select({
        pass: lobbyPasses,
        creator: { id: users.id, handle: users.handle, displayName: users.displayName },
      })
      .from(lobbyPasses)
      .innerJoin(users, eq(users.id, lobbyPasses.creatorId))
      .where(and(
        eq(lobbyPasses.status, 'open'),
        gameMatch
          ? or(ilike(lobbyPasses.title, q), inArray(lobbyPasses.game, matchingGameCodes as any))
          : ilike(lobbyPasses.title, q),
      ))
      .limit(limit),
  ]);

  return { users: matchUsers, services: matchServices, goals: matchGoals, passes: matchPasses };
}
