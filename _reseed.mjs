import postgres from 'postgres';
import { readFileSync } from 'fs';

const sql = postgres('postgresql://postgres.rvtobamfdsamqsyrfzlb:OnePiece%231059@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres', { prepare: false });

console.log('1. Truncating app tables...');
await sql.unsafe(`
  TRUNCATE TABLE
    reviews, service_requests, lobby_pass_bids, lobby_passes,
    squad_goal_contributions, squad_goals, squad_ranks,
    transactions, coin_purchases, vault_balances,
    game_ranks, provider_profiles, services,
    user_audit_log, notifications, badge_awards, referrals, streaks,
    message_threads, messages
  RESTART IDENTITY CASCADE;
`);

console.log('2. Deleting seed users (preserving real Google account)...');
await sql.unsafe(`DELETE FROM users WHERE email LIKE '%@squadly.gg' OR email LIKE 'fan%@example.com';`);

console.log('3. Running seed.sql...');
const seed = readFileSync('db/seed.sql', 'utf8').replace(/SET LOCAL session_replication_role = '\w+';/g, '');
await sql.unsafe(seed);

console.log('4. Verifying scout...');
const scout = await sql`SELECT handle, display_name, is_provider FROM users WHERE handle = 'scout'`;
console.log('scout:', scout);

const all = await sql`SELECT handle, is_provider FROM users ORDER BY is_provider DESC, handle`;
console.log(`\nTotal users: ${all.length}`);
for (const r of all) console.log(`  ${r.handle} | provider=${r.is_provider}`);

console.log('\n5. Creating test DM threads for real user(s)...');
const realUsers = await sql`
  SELECT id, handle, display_name FROM users
  WHERE email NOT LIKE '%@squadly.gg' AND email NOT LIKE 'fan%@example.com'
`;
console.log(`Found ${realUsers.length} real user(s)`);

const seedCreators = [
  { id: '11111111-1111-1111-1111-111111111111', handle: 'scout' },
  { id: '22222222-2222-2222-2222-222222222222', handle: 'gauravigl' },
  { id: '33333333-3333-3333-3333-333333333333', handle: 'riyaheadshot' },
];

for (const user of realUsers) {
  console.log(`  → seeding threads for @${user.handle ?? user.id}`);
  for (const creator of seedCreators) {
    if (creator.id === user.id) continue;
    // ensure vault row exists for the real user (so coin balance shows)
    await sql`
      INSERT INTO vault_balances (user_id, inr_balance, coin_balance)
      VALUES (${user.id}, 0, 1000)
      ON CONFLICT (user_id) DO NOTHING
    `;
    const [thread] = await sql`
      INSERT INTO message_threads (creator_id, fan_id, unlock_source, last_message_at)
      VALUES (${creator.id}, ${user.id}, 'service_request', now() - interval '2 hours')
      ON CONFLICT (creator_id, fan_id) DO UPDATE SET last_message_at = EXCLUDED.last_message_at
      RETURNING id
    `;
    await sql`
      INSERT INTO messages (thread_id, sender_id, body, sent_at) VALUES
        (${thread.id}, ${creator.id}, ${'gg, hit me up when you wanna run a session — DM unlocked from your last booking.'}, now() - interval '2 hours'),
        (${thread.id}, ${user.id}, ${'sounds good, can we do this weekend?'}, now() - interval '90 minutes'),
        (${thread.id}, ${creator.id}, ${"Sat 9pm IST works. Drop your in-game ID and I'll send the lobby code."}, now() - interval '60 minutes')
    `;
  }
}

console.log('\n6. Done — DMs seeded for real users.');
await sql.end();
