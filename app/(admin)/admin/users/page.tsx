import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { desc } from 'drizzle-orm';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isAdmin } from '@/lib/admin';
import { db, users } from '@/lib/db';
import { BanToggle } from '@/components/squadly/ban-toggle';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/admin/users');
  if (!(await isAdmin(session.user.id))) redirect('/home');

  const q = searchParams.q?.toLowerCase().trim();
  const all = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
    limit: 100,
  });
  const list = q
    ? all.filter((u) => u.handle.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q))
    : all;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Link href="/admin" className="font-mono text-sm text-text-2 hover:text-neon-cyan">
          ← Admin
        </Link>
        <h1 className="mt-6 font-display text-display-md text-text-0">Users</h1>

        <form className="mt-6" action="/admin/users">
          <input
            type="search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Search by handle, email, or name"
            className="w-full max-w-md rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
          />
        </form>

        <Card className="mt-6 overflow-hidden">
          <div className="divide-y divide-border">
            {list.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                <div className="h-9 w-9 overflow-hidden rounded-full border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.avatarUrl ?? `https://i.pravatar.cc/100?u=${u.id}`} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/${u.handle}`} className="font-mono text-sm text-text-0 hover:text-neon-cyan">
                      @{u.handle}
                    </Link>
                    {u.isVerified && <Badge variant="default">✓</Badge>}
                    {u.isAdmin && <Badge variant="magenta">admin</Badge>}
                    {u.is18Plus && <Badge variant="green">18+</Badge>}
                    {u.isBanned && <Badge variant="magenta">banned</Badge>}
                  </div>
                  <div className="font-mono text-xs text-text-3">{u.email}</div>
                </div>
                <BanToggle userId={u.id} isBanned={u.isBanned} />
              </div>
            ))}
            {list.length === 0 && (
              <div className="px-5 py-12 text-center text-text-3">
                <p className="font-mono text-sm">No users match.</p>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
