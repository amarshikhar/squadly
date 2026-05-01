import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgeVerifyForm } from '@/components/squadly/age-verify-form';
import { getAgeStatus } from '@/lib/age';

export const dynamic = 'force-dynamic';

export default async function AgeVerifyPage({ searchParams }: { searchParams: { next?: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/profile/age');

  const status = await getAgeStatus(session.user.id);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x max-w-xl py-16">
        <Badge variant="amber">● Age verification</Badge>
        <h1 className="mt-4 font-display text-display-md text-text-0">Confirm you&apos;re 18+</h1>
        <p className="mt-3 text-text-2">
          Money-moving features (coin top-ups, Lobby Pass bidding, withdrawals) require you to be 18 or older.
          We only store the year you were born and the verification timestamp.
        </p>

        <Card className="mt-10 p-7">
          {status.is18Plus ? (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-neon-green/10 text-neon-green text-2xl">
                ✓
              </div>
              <h2 className="mt-4 font-display text-xl text-text-0">You&apos;re verified.</h2>
              <p className="mt-2 text-sm text-text-2">
                Verified on {status.verifiedAt ? new Date(status.verifiedAt).toLocaleDateString() : '—'}.
              </p>
            </div>
          ) : (
            <AgeVerifyForm next={searchParams.next} />
          )}
        </Card>

        <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-widest text-text-3">
          By verifying you confirm your statement is true · false attestation may result in account termination
        </p>
      </main>
    </div>
  );
}
