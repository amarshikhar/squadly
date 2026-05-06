import Link from 'next/link';
import { Nav } from '@/components/squadly/nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { auth } from '@/lib/auth';

export default async function LandingPage() {
  const session = await auth();
  const isAuthed = !!session?.user;

  // Both CTAs route authenticated users to their Hub instead of the sign-in page.
  const ctaHref = isAuthed ? '/home' : '/signin';
  const ctaPrimary = isAuthed ? 'Join Squad' : 'Get started';

  return (
    <div className="min-h-screen">
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute inset-0 bg-grad-brand-soft" />

        <div className="container-x relative pt-20 pb-32 md:pt-28">
          <Badge variant="default" className="mb-8">● Beta · India 2026</Badge>

          <h1 className="font-display text-display-xl text-text-0">
            The home for India&apos;s<br />
            <span className="text-neon-cyan glow-cyan-text">gaming creators.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-text-1 md:text-xl">
            Squadly brings streamers and fans together. Chase squad goals, bid for lobby slots
            and book real services from their favourite streamers. One squad. One Vault.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={ctaHref}>{ctaPrimary}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/services">Browse creators</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* MECHANICS — services, passes, goals (all three) */}
      <section className="container-x py-24">
        <div className="mb-12 max-w-2xl">
          <Badge>● Three ways to squad up</Badge>
          <h2 className="mt-6 font-display text-display-lg text-text-0">
            Services, Passes, Goals — built like a game, not a marketplace.
          </h2>
          <p className="mt-4 text-text-2">
            Three simple mechanics that let creators earn and fans actually take part.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <MechanicCard
            tag="Services"
            tagColor="cyan"
            title="Book real coaching, duos, hype reels"
            forFan="Pay in ₹ via UPI. Book a slot. Get the service."
            forCreator="List a service, set a price. Stripe payout when delivered."
          />
          <MechanicCard
            tag="Lobby Pass"
            tagColor="magenta"
            title="Bid coins to win a slot in the squad"
            forFan="Top up coins, bid on a live auction. Top bidders queue with the streamer."
            forCreator="Open a time-boxed Pass. Top bidders unlock DMs and a session with you."
          />
          <MechanicCard
            tag="Squad Goals"
            tagColor="green"
            title="Crowd-fund a creator's next push"
            forFan="Chip in coins together. Hit the target → creator delivers."
            forCreator="Set a goal (rank push, charity stream). Fans fund it as a squad."
          />
        </div>
      </section>

      {/* HOW IT WORKS — step-by-step for both audiences */}
      <section className="container-x pb-24">
        <div className="mb-10 max-w-2xl">
          <Badge variant="muted">● How it works</Badge>
          <h2 className="mt-4 font-display text-display-md text-text-0">
            One Vault. Two sides. Zero friction.
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* For fans */}
          <div className="rounded-2xl border border-border-bright/30 bg-bg-1 p-7">
            <div className="font-mono text-xs uppercase tracking-widest text-neon-cyan">For fans</div>
            <h3 className="mt-2 font-display text-2xl text-text-0">Pay once. Spend many ways.</h3>
            <ol className="mt-5 space-y-4 text-sm text-text-1">
              <Step n={1}>
                Top up coins via UPI in your <span className="font-mono text-neon-cyan">Vault</span>.
              </Step>
              <Step n={2}>
                Use coins to <span className="font-mono">bid on Lobby Passes</span> or
                <span className="font-mono"> back Squad Goals</span>.
              </Step>
              <Step n={3}>
                Pay ₹ direct for <span className="font-mono">Services</span> when you want a real booking.
              </Step>
              <Step n={4}>
                Climb your favourite creator&apos;s leaderboard. Unlock DMs.
              </Step>
            </ol>
          </div>

          {/* For creators */}
          <div className="rounded-2xl border border-border-magenta/40 bg-bg-1 p-7">
            <div className="font-mono text-xs uppercase tracking-widest text-neon-magenta">For creators</div>
            <h3 className="mt-2 font-display text-2xl text-text-0">Run your squad. Get paid.</h3>
            <ol className="mt-5 space-y-4 text-sm text-text-1">
              <Step n={1} accent="magenta">
                List <span className="font-mono">Services</span> (coaching, duo, hype reel) priced in ₹.
              </Step>
              <Step n={2} accent="magenta">
                Open a <span className="font-mono">Lobby Pass</span> when you stream — fans bid coins for slots.
              </Step>
              <Step n={3} accent="magenta">
                Set a <span className="font-mono">Squad Goal</span> — rank push, charity stream — fans fund it.
              </Step>
              <Step n={4} accent="magenta">
                Cash out via <span className="font-mono">Stripe</span> when the work is done.
              </Step>
            </ol>
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="container-x py-24">
        <div className="rounded-2xl border border-border bg-bg-1 p-12 text-center md:p-16">
          <h2 className="font-display text-display-lg text-text-0">Ready to run your squad?</h2>
          <p className="mt-4 text-lg text-text-2">
            {isAuthed
              ? 'Your Hub is one click away — manage services, passes, goals, and the Vault.'
              : 'Sign in with Discord, set up your services in minutes, and start earning.'}
          </p>
          <Button asChild className="mt-8">
            <Link href={ctaHref}>{ctaPrimary}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function MechanicCard({
  tag,
  tagColor,
  title,
  forFan,
  forCreator,
}: {
  tag: string;
  tagColor: 'cyan' | 'magenta' | 'green';
  title: string;
  forFan: string;
  forCreator: string;
}) {
  const colors = {
    cyan: 'text-neon-cyan',
    magenta: 'text-neon-magenta',
    green: 'text-neon-green',
  };
  return (
    <div className="card-mock flex h-full flex-col p-7">
      <div className={`font-mono text-xs uppercase tracking-widest ${colors[tagColor]}`}>{tag}</div>
      <h3 className="mt-2 font-display text-xl leading-tight text-text-0">{title}</h3>
      <div className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">For fans</div>
          <p className="mt-1 text-text-1">{forFan}</p>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">For creators</div>
          <p className="mt-1 text-text-1">{forCreator}</p>
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  accent = 'cyan',
  children,
}: {
  n: number;
  accent?: 'cyan' | 'magenta';
  children: React.ReactNode;
}) {
  const ring = accent === 'magenta' ? 'border-neon-magenta/40 text-neon-magenta' : 'border-neon-cyan/40 text-neon-cyan';
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 inline-grid h-6 w-6 flex-shrink-0 place-items-center rounded-full border ${ring} font-mono text-xs`}>
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
