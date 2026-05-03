import postgres from 'postgres';
const sql = postgres('postgresql://postgres.rvtobamfdsamqsyrfzlb:OnePiece%231059@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres', { prepare: false });
const rows = await sql`SELECT handle, display_name, email, is_provider, created_at FROM users ORDER BY created_at DESC`;
console.log(`Total users: ${rows.length}`);
for (const r of rows) console.log(`  ${r.handle} | ${r.display_name} | ${r.email} | provider=${r.is_provider}`);
const scout = await sql`SELECT id, handle, is_provider FROM users WHERE handle = 'scout'`;
console.log('\nscout lookup:', scout);
await sql.end();
