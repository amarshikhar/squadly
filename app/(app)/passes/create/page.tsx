import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Badge } from '@/components/ui/badge';
import { LobbyPassForm } from '@/components/squadly/lobby-pass-form';

export default async function CreatePassPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/passes/create');

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge variant="magenta">● Lobby Pass</Badge>
        <h1 className="mt-4 font-display text-display-md text-text-0">Create a Lobby Pass</h1>
        <p className="mt-3 max-w-xl text-text-2">
          Time-boxed bidding for slots in your squad. Top bidders unlock DMs and queue up with you.
        </p>

        <div className="mt-12 max-w-2xl">
          <LobbyPassForm />
        </div>
      </main>
    </div>
  );
}
