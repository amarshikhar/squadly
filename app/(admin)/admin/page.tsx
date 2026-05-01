import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isAdmin } from '@/lib/admin';
import { db, disputes, users } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/admin');
  if (!(await isAdmin(session.user.id))) redirect('/home');

  const [{ openDisputes }] = await db
    .select({ openDisputes: sql<number>`COUNT(*)` })
    .from(disputes)
    .where(sql`${disputes.status} IN ('open', 'investigating')`);

  const [{ bannedUsers }] = await db
    .select({ bannedUsers: sql<number>`COUNT(*)` })
    .from(users)
    .where(sql`${users.isBanned} = TRUE`);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge variant="magenta">● Admin</Badge>
        <h1 className="mt-4 font-display text-display-md text-text-0">Admin dashboard</h1>
        <p className="mt-3 text-text-2">
          You have admin access. Use it sparingly. Every action is logged.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Link href="/admin/disputes">
            <Card className="p-6 transition-colors hover:border-border-magenta">
              <div className="font-mono text-xs uppercase tracking-widest text-text-2">Open disputes</div>
              <div className="mt-2 font-display text-3xl text-neon-magenta">{Number(openDisputes)}</div>
              <div className="mt-3 font-mono text-xs text-neon-magenta">Resolve →</div>
            </Card>
          </Link>

          <Link href="/admin/users">
            <Card className="p-6 transition-colors hover:border-border-bright">
              <div className="font-mono text-xs uppercase tracking-widest text-text-2">Banned users</div>
              <div className="mt-2 font-display text-3xl text-text-0">{Number(bannedUsers)}</div>
              <div className="mt-3 font-mono text-xs text-text-2">Manage →</div>
            </Card>
          </Link>

          <Card className="p-6 opacity-50">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Moderation queue</div>
            <div className="mt-2 font-display text-3xl text-text-3">—</div>
            <div className="mt-3 font-mono text-xs text-text-3">Phase 4B</div>
          </Card>
        </div>
      </main>
    </div>
  );
}
