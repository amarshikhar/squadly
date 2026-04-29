/**
 * NextAuth.js v5 (Auth.js) configuration for Squadly.
 * Providers: Apple, Google, Discord.
 * Persistence: Drizzle adapter against Supabase Postgres.
 */
import NextAuth, { type DefaultSession } from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { authConfig } from './config';
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
    async signIn({ user }) {
      // TODO: ensure vault_balances row exists for new users
      console.info('[auth] sign-in', user.email);
    },
  },
});
