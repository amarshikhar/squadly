/**
 * Typed query helpers for Squadly.
 * Centralizes Drizzle queries used across pages and API routes.
 */
import { eq, and, or, desc, asc, sql, gt, lt, inArray, ilike } from 'drizzle-orm';
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
  limit?: number;
}

export async function listServices(filters: ServiceFilters = {}) {
  const conditions = [eq(services.status, filters.status ?? 'live')];
  if (filters.game) conditions.push(eq(services.game, filters.game as any));
  if (filters.type) conditions.push(eq(services.type, filters.type as any));
  if (filters.creatorId) conditions.push(eq(services.creatorId, filters.creatorId));
  if (filters.search) conditions.push(ilike(services.title, `%${filters.search}%`));

  return db
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
    .where(and(...conditions))
    .orderBy(desc(services.isFeatured), desc(services.createdAt))
    .limit(filters.limit ?? 50);
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
