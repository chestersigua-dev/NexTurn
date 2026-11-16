import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionEdge, SESSION_COOKIE_NAME } from './lib/session-edge';

const PUBLIC_PATHS = [
  '/login',
  '/turnstile',
  '/api/auth/login',
  '/api/turnstile/scan',
  '/api/turnstile/info',
  '/api/settings/system',
];

const SESSION_SECRET = process.env.SESSION_SECRET || 'nexturn-default-secret-key-at-least-32-chars-long';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow static Next.js assets, public uploads, static assets, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|css|js)$/i)
  ) {
    return NextResponse.next();
  }

  // 2. Check if route is in public list
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // 3. Extract and verify session token using Edge-compatible Web Crypto
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionEdge(token, SESSION_SECRET) : null;

  // 4. Handle unauthenticated access
  if (!session) {
    if (isPublic) {
      return NextResponse.next();
    }

    if (pathname.startsWith('/api/')) {
      const res = NextResponse.json(
        { error: 'Unauthorized: Authentication required to access this resource' },
        { status: 401 }
      );
      if (token) {
        res.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
      }
      return res;
    }

    // Redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    const res = NextResponse.redirect(loginUrl);
    if (token) {
      res.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
