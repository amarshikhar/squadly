/**
 * Daily streak tracking.
 *
 * Call `touch(userId)` on every authenticated request that signals real
 * engagement (visit + transact). The function:
 *   - increments current_days if last activity was yesterday
 *   - resets to 1 if last activity was >1 day ago
 *   - no-op if already touched today
 *   - updates longest_days when current crosses it
 *
 * Award `streak_7_day` and `streak_30_day` badges when thresholds hit.
 */

import { eq } from 'drizzle-orm';
import { db } from './db';
import { streaks, badgeAwards } from './db/schema';
import { emit } from './notifications';

function todayKey(): string {
  // YYYY-MM-DD in UTC
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function touch(userId: string): Promise<{ currentDays: number; promoted: boolean }> {
  const existing = await db.query.streaks.findFirst({ where: eq(streaks.userId, userId) });
  const today = todayKey();
  const yesterday = yesterdayKey();

  if (!existing) {
    await db.insert(streaks).values({
      userId,
      currentDays: 1,
      longestDays: 1,
      lastActiveOn: today,
    });
    return { currentDays: 1, promoted: false };
  }

  // Already touched today
  if (existing.lastActiveOn === today) {
    return { currentDays: existing.currentDays, promoted: false };
  }

  let newCurrent: number;
  if (existing.lastActiveOn === yesterday) {
    newCurrent = existing.currentDays + 1;
  } else {
    newCurrent = 1; // streak broken, restart
  }

  const newLongest = Math.max(existing.longestDays, newCurrent);
  await db
    .update(streaks)
    .set({ currentDays: newCurrent, longestDays: newLongest, lastActiveOn: today })
    .where(eq(streaks.userId, userId));

  // Badge promotions
  let promoted = false;
  if (newCurrent === 7) {
    await maybeAwardBadge(userId, 'streak_7_day');
    promoted = true;
  }
  if (newCurrent === 30) {
    await maybeAwardBadge(userId, 'streak_30_day');
    promoted = true;
  }

  return { currentDays: newCurrent, promoted };
}

async function maybeAwardBadge(userId: string, code: 'streak_7_day' | 'streak_30_day') {
  const inserted = await db
    .insert(badgeAwards)
    .values({ userId, code })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0) {
    await emit({
      userId,
      type: 'badge_awarded',
      title: `Badge unlocked: ${code === 'streak_7_day' ? '7-day streak' : '30-day streak'}`,
      body: 'Keep the streak going to unlock more.',
      link: '/home',
      relatedId: inserted[0].id,
    });
  }
}

export async function getStreak(userId: string) {
  return db.query.streaks.findFirst({ where: eq(streaks.userId, userId) });
}
