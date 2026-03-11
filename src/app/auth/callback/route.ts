import { NextRequest, NextResponse } from 'next/server';
import { SessionData, setSessionOnResponse, getSessionFromRequest } from '@/lib/auth/session';
import { verifyIdToken } from '@/lib/auth/cognitoVerifier';

const CSRF_COOKIE_NAME = 'oauth_csrf_token';

const AUTH_SERVICE_CODE_PATTERN = /^[a-f0-9]{64}$/;
const COGNITO_CODE_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function detectCodeSource(code: string): 'auth-service' | 'cognito' | 'unknown' {
  if (AUTH_SERVICE_CODE_PATTERN.test(code)) return 'auth-service';
  if (COGNITO_CODE_PATTERN.test(code)) return 'cognito';
  return 'unknown';
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/?error=authentication_failed', request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/?error=authentication_failed', request.url));
  }

  const codeSource = detectCodeSource(code);

  const oldSession = getSessionFromRequest(request);

  // CSRF validation (dual: cookie + session)
  const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const cookieValid = !!csrfCookie && timingSafeEqual(csrfCookie, state);
  const sessionValid = !!oldSession?.oauthState && timingSafeEqual(oldSession.oauthState, state);
  const csrfValid = cookieValid || sessionValid;

  if (!csrfValid && codeSource === 'auth-service') {
    return NextResponse.redirect(new URL('/?error=authentication_failed', request.url));
  }

  if (!csrfValid && codeSource === 'unknown') {
    return NextResponse.redirect(new URL('/?error=authentication_failed', request.url));
  }

  const returnTo = oldSession?.returnTo;

  try {
    let tokenData: { idToken: string; accessToken?: string; refreshToken?: string; expiresIn: number };

    if (codeSource === 'auth-service') {
      const response = await fetch(`${process.env.AUTH_SERVICE_URL}/auth/oauth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AgentsStudioDemo/1.0 (OAuth Callback)',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ code, state, redirectUri: process.env.COGNITO_REDIRECT_URI }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Auth-service exchange failed: ${response.status} ${body}`);
      }
      tokenData = await response.json();
    } else {
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.COGNITO_CLIENT_ID!,
        code,
        redirect_uri: process.env.COGNITO_REDIRECT_URI!,
      });

      const response = await fetch(`https://${process.env.COGNITO_DOMAIN}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Cognito token exchange failed: ${response.status} ${body}`);
      }

      const data = await response.json();
      tokenData = {
        idToken: data.id_token,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    }

    const payload = await verifyIdToken(tokenData.idToken);
    if (!payload) {
      throw new Error('ID token verification failed');
    }

    const redirectTo = (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) ? returnTo : '/';
    const successResponse = NextResponse.redirect(new URL(redirectTo, request.url));

    successResponse.headers.append('Set-Cookie', `${CSRF_COOKIE_NAME}=; Path=/; Max-Age=0`);

    const session: SessionData = {
      user: {
        email: payload.email as string,
        name: payload.name as string | undefined,
        sub: payload.sub,
      },
      tokenExpiry: Date.now() + tokenData.expiresIn * 1000,
      idToken: tokenData.idToken,
      refreshToken: tokenData.refreshToken,
    };

    setSessionOnResponse(successResponse, session);

    return successResponse;
  } catch (err) {
    console.error('[auth/callback] error:', err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(new URL('/?error=authentication_failed', request.url));
  }
}
