import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Badge } from '@/components/ui/badge';
import { GoalForm } from '@/components/squadly/goal-form';

export default async function CreateGoalPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/goals/create');

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● Squad Goal</Badge>
        <h1 className="mt-4 font-display text-display-md text-text-0">Open a Squad Goal</h1>
        <p className="mt-3 max-w-xl text-text-2">
          Rally your squad to crowd-fund a push. Hit the target, deliver the win.
        </p>

        <div className="mt-12 max-w-2xl">
          <GoalForm />
        </div>
      </main>
    </div>
  );
}
