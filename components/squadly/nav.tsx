import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';
import { getVaultBalance } from '@/lib/db/queries';
import { formatCoins } from '@/lib/utils';
import { NotificationsBell } from './notifications-bell';

export async function Nav() {
  const session = await auth();
  const vault = session?.user?.id ? await getVaultBalance(session.user.id) : null;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-0/70 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-text-0">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-grad-brand font-bold text-black shadow-glow-cyan">
            S
          </span>
          <span className="text-lg">Squadly</span>
        </Link>

        <div className="hidden items-center gap-6 text-sm text-text-2 md:flex">
          <Link href="/services" className="transition-colors hover:text-neon-cyan">Browse</Link>
          <Link href="/goals" className="transition-colors hover:text-neon-cyan">Goals</Link>
          {session?.user && (
            <>
              <Link href="/feed" className="transition-colors hover:text-neon-cyan">Feed</Link>
              <Link href="/requests" className="transition-colors hover:text-neon-cyan">Requests</Link>
              <Link href="/messages" className="transition-colors hover:text-neon-cyan">DMs</Link>
              <Link href="/home" className="transition-colors hover:text-neon-cyan">Hub</Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              <Link
                href="/vault"
                className="hidden items-center gap-2 rounded-lg border border-border bg-bg-1 px-3 py-1.5 font-mono text-xs text-text-1 transition-colors hover:border-border-bright sm:flex"
              >
                <span className="text-neon-cyan">●</span>
                {formatCoins(vault?.coinBalance ?? 0)}
              </Link>
              <NotificationsBell />
              <Link
                href="/home"
                className="font-mono text-sm text-text-0 hover:text-neon-cyan"
              >
                {session.user.name?.split(' ')[0] ?? 'You'}
              </Link>
            </>
          ) : (
            <>
              <Link href="/signin" className="text-sm text-text-2 hover:text-neon-cyan">Sign in</Link>
              <Button asChild size="sm">
                <Link href="/signin">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
