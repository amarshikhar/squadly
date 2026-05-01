import { Nav } from '@/components/squadly/nav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Squadly Terms of Service · v2026-05-01',
};

const TERMS_VERSION = '2026-05-01';

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x max-w-3xl py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-text-3">
          Version {TERMS_VERSION} · effective {TERMS_VERSION}
        </p>
        <h1 className="mt-4 font-display text-display-md text-text-0">Terms of Service</h1>

        <div className="prose-squadly mt-10 space-y-8 text-text-1 [&>section>h2]:mt-10 [&>section>h2]:font-display [&>section>h2]:text-2xl [&>section>h2]:text-text-0 [&_p]:leading-relaxed [&_li]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6">
          <section>
            <h2>1. Who we are</h2>
            <p>
              Squadly (&ldquo;Squadly&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates a hybrid creator-fan and
              services marketplace at squadly.gg, primarily serving Indian gaming creators and their audiences.
              By creating an account, you agree to these Terms.
            </p>
          </section>

          <section>
            <h2>2. Eligibility</h2>
            <ul>
              <li>You must be at least 18 years old to spend or receive money on Squadly (coin top-ups, bidding, withdrawals, paid services).</li>
              <li>Account browsing and creation are open to users 13 and older with parental consent in line with applicable Indian law (DPDP Act, 2023).</li>
              <li>One person, one account. Sock-puppet or shared accounts are prohibited.</li>
            </ul>
          </section>

          <section>
            <h2>3. The Vault and Coins</h2>
            <ul>
              <li>The Vault holds your INR balance (from creator payouts) and Coins (from purchases).</li>
              <li>Coins are a closed-loop in-app currency: they cannot be redeemed for cash. Coins fund Squad Goals, Lobby Pass bids, tips, and gifts.</li>
              <li>Coin purchases are final once captured. Refunds are at our discretion in cases of fraud, technical error, or admin-resolved dispute.</li>
            </ul>
          </section>

          <section>
            <h2>4. Services and Lobby Passes</h2>
            <ul>
              <li>Creators set service titles, descriptions, prices, and delivery windows. Buyers book at the listed price.</li>
              <li>Squadly takes a 15% commission on each completed service (10% for Streamer Pro). The remainder is credited to the creator&apos;s Vault on completion, subject to a 24-hour hold.</li>
              <li>Lobby Pass auctions are time-boxed: top N bidders win slots when the auction closes; losing bidders&apos; coins are refunded to their Vault.</li>
            </ul>
          </section>

          <section>
            <h2>5. Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Post or send content that is illegal, harassing, sexually explicit involving minors, or violent.</li>
              <li>Misrepresent your in-game rank, identity, or affiliation.</li>
              <li>Use bots, scrapers, or scripts to manipulate bidding, ranks, or reviews.</li>
              <li>Conduct paid services off-platform to evade commission, after meeting the buyer through Squadly.</li>
            </ul>
            <p>Violations may result in content removal, account suspension, or permanent ban.</p>
          </section>

          <section>
            <h2>6. Disputes</h2>
            <p>
              Buyers may raise a dispute on a service request within 7 days of completion. Creator payouts on disputed
              requests are held until our admin team reviews and resolves the dispute. Resolutions may include full refund,
              partial refund, or no refund based on evidence.
            </p>
          </section>

          <section>
            <h2>7. Payments</h2>
            <ul>
              <li>Indian fans pay via Razorpay (UPI, cards, net banking). International fans pay via Stripe.</li>
              <li>Indian creators receive payouts via Razorpay X to a UPI VPA or bank account. International creators receive payouts via Stripe Connect, weekly.</li>
              <li>You are responsible for taxes on income earned through Squadly. We may issue GST invoices and TDS certificates as required by Indian law once thresholds are crossed.</li>
            </ul>
          </section>

          <section>
            <h2>8. Intellectual property</h2>
            <p>
              You retain ownership of content you upload (profile photos, hype reels, service descriptions). You grant Squadly
              a worldwide, royalty-free license to host, display, and promote that content within the platform and in marketing.
            </p>
          </section>

          <section>
            <h2>9. Limitation of liability</h2>
            <p>
              Squadly is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law, our total liability for any claim
              is limited to the greater of (a) ₹10,000 or (b) fees you paid us in the 12 months prior to the claim.
            </p>
          </section>

          <section>
            <h2>10. Changes</h2>
            <p>
              We may update these Terms. Material changes will be announced and require fresh acceptance. The current version
              and effective date are at the top of this page.
            </p>
          </section>

          <section>
            <h2>11. Contact</h2>
            <p>
              Questions: <a className="text-neon-cyan underline" href="mailto:hello@squadly.gg">hello@squadly.gg</a>
              <br />
              Grievance officer (DPDP Act): <a className="text-neon-cyan underline" href="mailto:grievance@squadly.gg">grievance@squadly.gg</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
