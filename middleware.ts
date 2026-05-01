import { NextResponse } from 'next/server';
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
];

// Routes that require an authenticated user
const PROTECTED_PATTERNS = [
  /^\/vault/,
  /^\/home/,
  /^\/goals\/create/,
  /^\/passes\/create/,
  /^\/api\/services$/,
  /^\/api\/goals/,
  /^\/api\/bids/,
  /^\/api\/coins/,
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths and creator handle pages (e.g. /scout)
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    !PROTECTED_PATTERNS.some((rx) => rx.test(pathname))
  ) {
    return NextResponse.next();
  }

  if (!req.auth?.user) {
    const signin = new URL('/signin', req.url);
    signin.searchParams.set('next', pathname);
    return NextResponse.redirect(signin);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Apply to everything except _next/static, _next/image, favicon
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
