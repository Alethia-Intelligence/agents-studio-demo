import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/callback',
  '/auth/logout',
  '/auth/status',
  '/auth/refresh',
  '/_next',
  '/favicon.ico',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const session = getSessionFromRequest(request);

  const isAuthenticated = !!session?.user;
  const isExpired = session?.tokenExpiry ? Date.now() >= session.tokenExpiry : true;

  if (!isAuthenticated || isExpired) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const loginUrl = new URL('/auth/login', request.url);
    if (pathname !== '/') loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Inject session idToken as Authorization header for proxied API requests
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('Authorization');
  if (session.idToken) {
    requestHeaders.set('Authorization', `Bearer ${session.idToken}`);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
