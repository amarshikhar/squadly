import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import { CookieBanner } from '@/components/squadly/cookie-banner';
import { Footer } from '@/components/squadly/footer';
import { RouteProgress } from '@/components/squadly/route-progress';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', display: 'swap' });
const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://squadly.gg'),
  openGraph: {
    title: APP_NAME,
    description: APP_TAGLINE,
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
      <body>
        {/* useSearchParams() needs a Suspense boundary at the layout level */}
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        {children}
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
