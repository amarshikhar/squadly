import Link from 'next/link';
import { AuthButtons } from '@/components/squadly/auth-buttons';

export default function SignInPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-0 px-6">
      <div className="absolute inset-0 grid-bg [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="absolute inset-0 bg-grad-brand-soft" />

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-10 flex items-center justify-center gap-2 font-display font-bold text-text-0">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-grad-brand text-black shadow-glow-cyan">S</span>
          <span className="text-xl">Squadly</span>
        </Link>

        <div className="card-mock p-8">
          <h1 className="font-display text-2xl font-bold text-text-0">Welcome to Squadly</h1>
          <p className="mt-2 text-sm text-text-2">
            Sign in with your usual identity. We&apos;ll set up your Vault and Streamer Hub on first login.
          </p>

          <div className="mt-8">
            <AuthButtons next={searchParams.next ?? '/home'} />
          </div>

          <p className="mt-8 border-t border-border pt-6 text-center text-xs leading-relaxed text-text-3">
            By continuing you agree to our{' '}
            <Link href="/terms" className="text-text-2 underline">Terms</Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-text-2 underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
