import { NextResponse } from 'next/server';
import { clearSessionOnResponse } from '@/lib/auth/session';

export async function GET() {
  const logoutUrl = new URL(`https://${process.env.COGNITO_DOMAIN}/logout`);
  logoutUrl.searchParams.append('client_id', process.env.COGNITO_CLIENT_ID!);
  logoutUrl.searchParams.append('logout_uri', process.env.COGNITO_POST_LOGOUT_REDIRECT_URI!);

  const response = NextResponse.redirect(logoutUrl.toString());
  clearSessionOnResponse(response);

  return response;
}
