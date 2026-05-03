import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';
import { getVaultBalance } from '@/lib/db/queries';
import { formatCoins } from '@/lib/utils';
import { NotificationsBell } from './notifications-bell';
import { MobileMenu } from './mobile-menu';
import { UserMenu } from './user-menu';
import { SearchBar } from './search-bar';

export async function Nav() {
  const session = await auth();
  const vault = session?.user?.id ? await getVaultBalance(session.user.id) : null;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-0/80 backdrop-blur-md">
      <div className="container-x flex h-16 items-center gap-3 sm:gap-4">
        {/* LEFT: logo */}
        <Link href="/" className="flex flex-shrink-0 items-center" aria-label="Squadly home">
          <Image
            src="/Logo1.png"
            alt="Squadly"
            width={120}
            height={32}
            priority
            className="h-9 w-auto"
          />
        </Link>

        {/* LEFT: nav links — desktop only */}
        <div className="hidden items-center gap-5 text-sm text-text-2 lg:flex">
          {session?.user && (
            <Link href="/feed" className="transition-colors hover:text-neon-cyan">Feed</Link>
          )}
          <Link href="/services" className="transition-colors hover:text-neon-cyan">Browse</Link>
          <Link href="/goals" className="transition-colors hover:text-neon-cyan">Goals</Link>
          <Link href="/passes" className="transition-colors hover:text-neon-cyan">Passes</Link>
          {session?.user && (
            <>
              <Link href="/requests" className="transition-colors hover:text-neon-cyan">Requests</Link>
              <Link href="/messages" className="transition-colors hover:text-neon-cyan">DMs</Link>
              <Link href="/home" className="transition-colors hover:text-neon-cyan">Hub</Link>
            </>
          )}
        </div>

        {/* Mobile-only top-bar search (between logo and right cluster) */}
        <div className="flex-1 lg:hidden">
          <SearchBar />
        </div>

        {/* RIGHT: coins, search, bell, profile (Shikhar at right edge) */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-2 sm:gap-3">
          {session?.user ? (
            <>
              {/* Coin pill — visible on tablet+ */}
              <Link
                href="/vault"
                className="hidden items-center gap-2 rounded-lg border border-border bg-bg-1 px-3 py-1.5 font-mono text-xs text-text-1 transition-colors hover:border-border-bright sm:flex"
              >
                <span className="text-neon-cyan">●</span>
                {formatCoins(vault?.coinBalance ?? 0)}
              </Link>

              {/* Desktop search — visible on lg+ only (mobile has its own above) */}
              <div className="hidden w-56 lg:block xl:w-72">
                <SearchBar />
              </div>

              {/* Bell — always visible */}
              <NotificationsBell />

              {/* Profile dropdown — desktop only (right edge) */}
              <UserMenu userName={session.user.name} />

              {/* Mobile hamburger — mobile only */}
              <MobileMenu
                isAuthed={true}
                userName={session.user.name}
                coinBalance={vault?.coinBalance ?? 0}
              />
            </>
          ) : (
            <>
              {/* Desktop search for guests too */}
              <div className="hidden w-56 lg:block xl:w-72">
                <SearchBar />
              </div>
              <Link
                href="/signin"
                className="hidden text-sm text-text-2 hover:text-neon-cyan md:inline"
              >
                Sign in
              </Link>
              <Button asChild size="sm" className="hidden md:inline-flex">
                <Link href="/signin">Get started</Link>
              </Button>
              <MobileMenu isAuthed={false} />
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
