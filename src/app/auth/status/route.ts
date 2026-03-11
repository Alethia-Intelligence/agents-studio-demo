import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ authenticated: false });
    }

    const isExpired = session.tokenExpiry ? Date.now() >= session.tokenExpiry : true;

    return NextResponse.json({
      authenticated: !isExpired,
      user: session.user,
      tokenExpiry: session.tokenExpiry,
      needsRefresh: session.tokenExpiry ? Date.now() >= session.tokenExpiry - 5 * 60 * 1000 : true,
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
