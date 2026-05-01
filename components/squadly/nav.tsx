import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';

export async function Nav() {
  const session = await auth();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-0/70 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-text-0">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-grad-brand font-bold text-black shadow-glow-cyan">
            S
          </span>
          <span className="text-lg">Squadly</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm text-text-2 md:flex">
          <Link href="/services" className="transition-colors hover:text-neon-cyan">Browse</Link>
          <Link href="/goals" className="transition-colors hover:text-neon-cyan">Squad Goals</Link>
          <Link href="/about" className="transition-colors hover:text-neon-cyan">About</Link>
        </div>

        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              <Link href="/vault" className="text-sm text-text-2 hover:text-neon-cyan">Vault</Link>
              <Link href={`/${session.user.handle ?? session.user.id}`} className="text-sm text-text-0">
                {session.user.name ?? 'You'}
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
