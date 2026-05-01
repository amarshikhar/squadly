import { Nav } from '@/components/squadly/nav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Squadly Privacy Policy · v2026-05-01',
};

export const PRIVACY_VERSION = '2026-05-01';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x max-w-3xl py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-text-3">
          Version {PRIVACY_VERSION} · effective {PRIVACY_VERSION}
        </p>
        <h1 className="mt-4 font-display text-display-md text-text-0">Privacy Policy</h1>

        <div className="mt-10 space-y-8 text-text-1 [&>section>h2]:mt-10 [&>section>h2]:font-display [&>section>h2]:text-2xl [&>section>h2]:text-text-0 [&_p]:leading-relaxed [&_li]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6">
          <section>
            <h2>1. Scope</h2>
            <p>
              This policy describes how Squadly collects, uses, and protects your personal data. It applies to anyone
              who creates an account, browses, or makes transactions on squadly.gg. We comply with India&apos;s Digital
              Personal Data Protection Act, 2023 (DPDP) and the EU GDPR for EU users.
            </p>
          </section>

          <section>
            <h2>2. Data we collect</h2>
            <ul>
              <li><strong>Account info:</strong> name, email, avatar from your OAuth provider (Google, Apple, Discord).</li>
              <li><strong>Profile:</strong> handle, bio, primary game, in-game IDs, rank verification proof.</li>
              <li><strong>Transactional:</strong> services bought/sold, coin top-ups, bids, withdrawals.</li>
              <li><strong>Communications:</strong> direct messages between matched users, dispute reasons.</li>
              <li><strong>Technical:</strong> IP address, browser type, device, session timestamps for security and rate limiting.</li>
              <li><strong>Age verification:</strong> year of birth (only — no full DOB) and timestamp of self-attestation.</li>
            </ul>
          </section>

          <section>
            <h2>3. How we use your data</h2>
            <ul>
              <li>Operate and improve the service (matching fans to creators, processing payments, displaying profiles).</li>
              <li>Prevent fraud, abuse, and illegal activity.</li>
              <li>Comply with legal obligations including tax reporting and law enforcement requests.</li>
              <li>Send transactional notifications (booking accepted, dispute resolved). Marketing emails are opt-in.</li>
            </ul>
          </section>

          <section>
            <h2>4. Sharing</h2>
            <ul>
              <li><strong>Payment processors</strong> (Razorpay, Stripe) receive billing details to process transactions.</li>
              <li><strong>Hosting and infra</strong> (Vercel, Supabase, Cloudflare) host your data with industry-standard encryption.</li>
              <li><strong>Game APIs</strong> (Riot Games) receive your in-game ID for rank verification only.</li>
              <li>We do not sell your data. We share aggregate, anonymized analytics with partners.</li>
            </ul>
          </section>

          <section>
            <h2>5. Your rights</h2>
            <p>Under DPDP and GDPR you have the right to:</p>
            <ul>
              <li>Access and download your data (request via <a className="text-neon-cyan underline" href="mailto:privacy@squadly.gg">privacy@squadly.gg</a>).</li>
              <li>Correct inaccurate data via your profile or by contacting us.</li>
              <li>Erase your account and personal data, subject to retention required by tax or legal obligations (typically 8 years for transaction records).</li>
              <li>Withdraw consent for non-essential processing at any time.</li>
              <li>File a grievance with our DPO at <a className="text-neon-cyan underline" href="mailto:grievance@squadly.gg">grievance@squadly.gg</a>; we respond within 7 working days.</li>
            </ul>
          </section>

          <section>
            <h2>6. Cookies</h2>
            <ul>
              <li><strong>Essential:</strong> session cookie for authentication. Cannot be disabled.</li>
              <li><strong>Analytics:</strong> we use PostHog post-launch with IP anonymization; opt-out via the cookie banner.</li>
              <li>No advertising cookies. No tracking pixels embedded by third parties.</li>
            </ul>
          </section>

          <section>
            <h2>7. Security</h2>
            <ul>
              <li>All traffic served over HTTPS.</li>
              <li>Secrets and credentials stored in encrypted environment variables; never logged.</li>
              <li>Row-level security policies on the database limit access to your own data even if our anon key were compromised.</li>
              <li>Webhook signatures verified for all incoming payment events.</li>
            </ul>
          </section>

          <section>
            <h2>8. Children</h2>
            <p>
              Squadly is not directed at children under 13. Users 13–17 may use the platform with parental consent for browsing,
              but money-moving features (coin top-ups, bidding, withdrawals) are restricted to users 18 and over.
            </p>
          </section>

          <section>
            <h2>9. Changes</h2>
            <p>
              We may update this Privacy Policy. Material changes will be communicated by email or in-app notice and require
              fresh acceptance.
            </p>
          </section>

          <section>
            <h2>10. Contact</h2>
            <p>
              Privacy: <a className="text-neon-cyan underline" href="mailto:privacy@squadly.gg">privacy@squadly.gg</a>
              <br />
              Grievance officer: <a className="text-neon-cyan underline" href="mailto:grievance@squadly.gg">grievance@squadly.gg</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
