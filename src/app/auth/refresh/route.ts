import { NextResponse } from 'next/server';
import { getSession, SessionData, setSessionOnResponse, clearSessionOnResponse } from '@/lib/auth/session';
import { verifyIdToken } from '@/lib/auth/cognitoVerifier';

export async function POST() {
  const session = await getSession();

  if (!session?.refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    const response = await fetch(`https://${process.env.COGNITO_DOMAIN}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.COGNITO_CLIENT_ID!,
        refresh_token: session.refreshToken,
      }).toString(),
    });

    if (!response.ok) throw new Error('Token refresh failed');

    const data = await response.json();

    const payload = await verifyIdToken(data.id_token);
    if (!payload) throw new Error('ID token verification failed');

    const updatedSession: SessionData = {
      user: {
        email: payload.email as string,
        name: payload.name as string | undefined,
        sub: payload.sub,
      },
      tokenExpiry: Date.now() + data.expires_in * 1000,
      idToken: data.id_token,
      refreshToken: session.refreshToken,
    };

    const jsonResponse = NextResponse.json({ success: true, expiresIn: data.expires_in });
    setSessionOnResponse(jsonResponse, updatedSession);
    return jsonResponse;
  } catch {
    const errorResponse = NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
    clearSessionOnResponse(errorResponse);
    return errorResponse;
  }
}
