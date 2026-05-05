import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/config';

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = [
  '/',
  '/signin',
  '/about',
  '/terms',
  '/privacy',
  '/api/auth',
  '/api/webhooks',
];

// Page routes that require auth (redirect to /signin)
// Note: /services and /goals are PUBLIC for browsing. /services/create and
// /passes/create remain auth-gated. /goals/[id] needs auth only to contribute,
// which is enforced inside the API handler — the detail page itself is public.
const PROTECTED_PAGE_PATTERNS = [
  /^\/vault/,
  /^\/home/,
  /^\/passes\/create/,
  /^\/requests/,
  /^\/payouts/,
  /^\/profile/,
  /^\/services\/create/,
  /^\/messages/,
  /^\/notifications/,
  /^\/referrals/,
  /^\/admin/,
  /^\/me\//,
];

// API routes where auth is enforced per-method inside the handler
// GET is public for discovery; POST/PATCH/DELETE require auth (checked in handler)
const PUBLIC_API_PATTERNS = [
  /^\/api\/services$/,
  /^\/api\/goals/,
  /^\/api\/bids/,
  /^\/api\/passes/,
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow public API routes (auth checked per-method in handlers)
  if (isApi && PUBLIC_API_PATTERNS.some((rx) => rx.test(pathname))) {
    return NextResponse.next();
  }

  // Protected pages: redirect to signin
  if (!isApi && PROTECTED_PAGE_PATTERNS.some((rx) => rx.test(pathname))) {
    if (!req.auth?.user) {
      const signin = new URL('/signin', req.url);
      signin.searchParams.set('next', pathname);
      return NextResponse.redirect(signin);
    }
  }

  // Protected API routes: return 401 JSON (not redirect)
  if (isApi && !req.auth?.user) {
    // Let the handler deal with auth — it returns proper 401 JSON
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Apply to everything except _next/static, _next/image, favicon
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
