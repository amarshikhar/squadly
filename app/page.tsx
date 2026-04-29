import Link from 'next/link';
import { Nav } from '@/components/squadly/nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GoalBar } from '@/components/squadly/goal-bar';
import { RankBadge } from '@/components/squadly/rank-badge';

export default function LandingPage() {
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
            Squadly is where streamers turn fans into recurring revenue and pros sell coaching that actually works.
            Squad Goals. Lobby Pass. Squad Ranks. UPI in. Stripe out. One Vault.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signin">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/services">Browse creators</Link>
            </Button>
          </div>

          <div className="mt-16 grid gap-8 border-t border-border pt-8 md:grid-cols-3">
            <Stat value="₹10,000Cr" label="India creator economy in 2026" color="cyan" />
            <Stat value="35%" label="YoY growth — fastest in the world" color="magenta" />
            <Stat value="467K" label="Gaming creators in India today" color="green" />
          </div>
        </div>
      </section>

      {/* MECHANICS PREVIEW */}
      <section className="container-x py-24">
        <div className="mb-12 max-w-2xl">
          <Badge>● Three new mechanics</Badge>
          <h2 className="mt-6 font-display text-display-lg text-text-0">
            Built like a game, not a marketplace.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="card-mock p-7">
            <div className="font-mono text-xs uppercase tracking-widest text-neon-cyan">Squad Goals</div>
            <h3 className="mt-2 font-display text-xl text-text-0">Conqueror push tonight</h3>
            <div className="mt-6">
              <GoalBar current={1250} target={1500} />
            </div>
          </div>

          <div className="card-mock p-7">
            <div className="font-mono text-xs uppercase tracking-widest text-neon-magenta">Lobby Pass</div>
            <h3 className="mt-2 font-display text-xl text-text-0">Pro Squad Night</h3>
            <p className="mt-3 text-sm text-text-2">
              <span className="font-mono font-semibold text-neon-magenta">3 slots open</span> · 4-hr squad
            </p>
            <div className="mt-6 rounded-xl border border-border-magenta bg-neon-magenta/5 p-4 text-center">
              <div className="font-mono text-xs uppercase tracking-widest text-neon-magenta">Top Bid</div>
              <div className="mt-1 font-display text-3xl font-bold text-neon-magenta glow-magenta-text">850</div>
              <div className="mt-1 font-mono text-xs text-text-2">@riyaheadshot</div>
            </div>
          </div>

          <div className="card-mock p-7">
            <div className="font-mono text-xs uppercase tracking-widest text-neon-green">Squad Ranks</div>
            <h3 className="mt-2 font-display text-xl text-text-0">Top fan ladder</h3>
            <div className="mt-6 flex items-end justify-between gap-2">
              <RankBadge tier="recruit" size="sm" showName />
              <RankBadge tier="soldier" size="sm" showName />
              <RankBadge tier="veteran" size="md" showName />
              <RankBadge tier="legend" size="sm" showName />
              <RankBadge tier="commander" size="sm" showName />
            </div>
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="container-x py-24">
        <div className="rounded-2xl border border-border bg-bg-1 p-12 text-center md:p-16">
          <h2 className="font-display text-display-lg text-text-0">Ready to run your squad?</h2>
          <p className="mt-4 text-lg text-text-2">Sign in with Discord, set up your services in minutes, and start earning.</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/signin">Get started — it&apos;s free</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-12 text-center font-mono text-xs uppercase tracking-widest text-text-3">
        Squadly · Built for BGMI · Valorant · Free Fire · v0.1
      </footer>
    </div>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: 'cyan' | 'magenta' | 'green' }) {
  const colors = {
    cyan: 'text-neon-cyan glow-cyan-text',
    magenta: 'text-neon-magenta glow-magenta-text',
    green: 'text-neon-green',
  };
  return (
    <div>
      <div className={`font-display text-3xl font-bold tracking-tight md:text-4xl ${colors[color]}`}>{value}</div>
      <div className="mt-1 text-sm text-text-2">{label}</div>
    </div>
  );
}
