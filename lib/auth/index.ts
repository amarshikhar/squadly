/**
 * NextAuth.js v5 (Auth.js) configuration for Squadly.
 * Providers: Apple, Google, Discord.
 * Persistence: Drizzle adapter against Supabase Postgres.
 */
import NextAuth, { type DefaultSession } from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users } from '@/lib/db';
import { authConfig } from './config';
import { eq, and, ne } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  primaryKey,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      handle?: string | null;
      isProvider?: boolean;
    } & DefaultSession['user'];
  }
}

// NextAuth adapter table definitions — must match the actual DB tables
const authUsers = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('display_name'),
  email: text('email').notNull(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('avatar_url'),
});

const accounts = pgTable('account', {
  userId: uuid('userId')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  type: text('type').$type<AdapterAccountType>().notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (t) => ({
  pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
}));

const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: uuid('userId')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

const verificationTokens = pgTable('verification_token', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.identifier, t.token] }),
}));

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: authUsers,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  events: {
    /**
     * Fires once per user, the first time they sign in via OAuth. The Drizzle
     * adapter has already inserted the row but doesn't know about our `handle`
     * column — it's left empty (or whatever default the DB has), which leads
     * to "@<empty>" rendering and 404s on /[handle]. We generate a clean,
     * unique handle from the email's local part right after creation.
     */
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      try {
        // Sanitize: lowercase, only [a-z0-9_], collapse repeats, trim ends.
        const local = user.email
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 28); // leave room for a 4-char collision suffix

        let candidate = local.length >= 3 ? local : `player_${user.id.slice(0, 6)}`;

        for (let attempt = 0; attempt < 10; attempt++) {
          const existing = await db.query.users.findFirst({
            where: and(eq(users.handle, candidate), ne(users.id, user.id)),
          });
          if (!existing) {
            await db.update(users).set({ handle: candidate }).where(eq(users.id, user.id));
            return;
          }
          // Collision — append random 4-char suffix and retry.
          const base = local.length >= 3 ? local.slice(0, 24) : 'player';
          candidate = `${base}_${Math.random().toString(36).slice(2, 6)}`;
        }
      } catch (e) {
        // Don't block sign-up if handle generation fails — log and move on.
        console.error('[auth] failed to set handle for new user', user.id, e);
      }
    },
    async signIn({ user }) {
      // TODO: ensure vault_balances row exists for new users
      console.info('[auth] sign-in', user.email);
    },
  },
});
