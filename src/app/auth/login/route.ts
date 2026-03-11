import { NextRequest, NextResponse } from 'next/server';
import { SessionData, setSessionOnResponse } from '@/lib/auth/session';

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

const CSRF_COOKIE_NAME = 'oauth_csrf_token';

export async function GET(request: NextRequest) {
  const state = generateToken();

  const loginUrl = new URL(process.env.CUSTOM_LOGIN_URL!);
  loginUrl.searchParams.append('client_id', process.env.COGNITO_CLIENT_ID!);
  loginUrl.searchParams.append('redirect_uri', process.env.COGNITO_REDIRECT_URI!);
  loginUrl.searchParams.append('state', state);

  const response = NextResponse.redirect(loginUrl.toString());

  const session: SessionData = {
    oauthState: state,
    returnTo: request.nextUrl.searchParams.get('redirect') || undefined,
  };
  setSessionOnResponse(response, session);

  const isProduction = process.env.NODE_ENV === 'production';
  response.headers.append(
    'Set-Cookie',
    `${CSRF_COOKIE_NAME}=${state}; HttpOnly; Path=/; SameSite=Lax; Max-Age=600${isProduction ? '; Secure' : ''}`
  );

  return response;
}
