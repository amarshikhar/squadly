import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Badge } from '@/components/ui/badge';
import { ServiceForm } from '@/components/squadly/service-form';

export default async function CreateServicePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/services/create');

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● Create a service</Badge>
        <h1 className="mt-4 font-display text-display-md text-text-0">List a new service</h1>
        <p className="mt-3 max-w-xl text-text-2">
          Pick a template, set your price, and go live in 60 seconds.
        </p>

        <div className="mt-12 max-w-2xl">
          <ServiceForm />
        </div>
      </main>
    </div>
  );
}
