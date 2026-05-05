#!/usr/bin/env node
/**
 * Grant coins to a user (admin/testing utility).
 *
 * Usage:
 *   node _grant-coins.mjs <handle> <amount>
 *
 * Example:
 *   node _grant-coins.mjs shikhar 50000
 *
 * What it does (atomic — single connection):
 *   1. Find the user by handle
 *   2. Upsert vault_balances row, incrementing coin_balance by <amount>
 *   3. Write a transactions row of type=coin_purchase / gateway=manual for
 *      audit trail (so the new balance ties out with the ledger)
 *   4. Print the new balance
 *
 * Reads DATABASE_URL from the environment (or .env.local — load with dotenv
 * if needed: `node --env-file=.env.local _grant-coins.mjs ...`).
 */
import postgres from 'postgres';

const handle = process.argv[2];
const amountArg = process.argv[3];
const amount = Number(amountArg);

if (!handle || !amountArg || !Number.isFinite(amount) || amount <= 0) {
  console.error('Usage: node _grant-coins.mjs <handle> <amount>');
  console.error('Example: node _grant-coins.mjs shikhar 50000');
  process.exit(1);
}

if (!Number.isInteger(amount)) {
  console.error('Amount must be a positive integer.');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set. Run with `node --env-file=.env.local _grant-coins.mjs ...`');
  process.exit(1);
}

const sql = postgres(dbUrl, { prepare: false, max: 1 });

try {
  const [user] = await sql`SELECT id, handle FROM users WHERE handle = ${handle} LIMIT 1`;
  if (!user) {
    console.error(`User @${handle} not found.`);
    process.exit(1);
  }

  await sql.begin(async (tx) => {
    // Upsert vault row
    await tx`
      INSERT INTO vault_balances (user_id, coin_balance, inr_balance, inr_pending, updated_at)
      VALUES (${user.id}, ${amount}, 0, 0, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET coin_balance = vault_balances.coin_balance + ${amount},
            updated_at = NOW()
    `;

    // Audit-trail transaction row
    await tx`
      INSERT INTO transactions (user_id, type, amount_coins, status, gateway, description, created_at, settled_at)
      VALUES (
        ${user.id},
        'coin_purchase',
        ${amount},
        'success',
        'manual',
        'Admin grant via _grant-coins.mjs',
        NOW(),
        NOW()
      )
    `;
  });

  const [{ coin_balance }] = await sql`
    SELECT coin_balance FROM vault_balances WHERE user_id = ${user.id}
  `;
  console.log(`✓ Granted ${amount.toLocaleString()} coins to @${user.handle}.`);
  console.log(`  New balance: ${Number(coin_balance).toLocaleString()} coins`);
} catch (e) {
  console.error('Failed:', e?.message ?? e);
  process.exit(1);
} finally {
  await sql.end();
}
