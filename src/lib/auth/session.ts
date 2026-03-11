/**
 * Session management using chunked cookies
 * Handles large JWT tokens by splitting across multiple cookies (4KB limit per cookie)
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_PREFIX = 'agents_studio_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const CHUNK_SIZE = 3800; // Leave room for cookie name + attributes

export interface SessionData {
  user?: {
    email: string;
    name?: string;
    sub: string;
  };
  tokenExpiry?: number;
  idToken?: string;
  refreshToken?: string;
  oauthState?: string;
  returnTo?: string;
}

function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

/**
 * Read session from request cookies (for use in middleware)
 */
export function getSessionFromRequest(request: NextRequest): SessionData | null {
  try {
    const allCookies = request.cookies.getAll();
    const sessionChunks: { index: number; value: string }[] = [];

    for (const cookie of allCookies) {
      if (cookie.name.startsWith(`${SESSION_COOKIE_PREFIX}_`)) {
        const index = parseInt(cookie.name.replace(`${SESSION_COOKIE_PREFIX}_`, ''), 10);
        if (!isNaN(index)) {
          sessionChunks.push({ index, value: cookie.value });
        }
      }
    }

    let sessionValue: string;

    if (sessionChunks.length > 0) {
      sessionChunks.sort((a, b) => a.index - b.index);
      sessionValue = sessionChunks.map(c => c.value).join('');
    } else {
      const single = request.cookies.get(SESSION_COOKIE_PREFIX);
      if (!single?.value) return null;
      sessionValue = single.value;
    }

    return JSON.parse(Buffer.from(sessionValue, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

/**
 * Read session from cookies() (for use in Server Components / Route Handlers)
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const sessionChunks: { index: number; value: string }[] = [];

    for (const cookie of allCookies) {
      if (cookie.name.startsWith(`${SESSION_COOKIE_PREFIX}_`)) {
        const index = parseInt(cookie.name.replace(`${SESSION_COOKIE_PREFIX}_`, ''), 10);
        if (!isNaN(index)) {
          sessionChunks.push({ index, value: cookie.value });
        }
      }
    }

    let sessionValue: string;

    if (sessionChunks.length > 0) {
      sessionChunks.sort((a, b) => a.index - b.index);
      sessionValue = sessionChunks.map(c => c.value).join('');
    } else {
      const single = cookieStore.get(SESSION_COOKIE_PREFIX);
      if (!single?.value) return null;
      sessionValue = single.value;
    }

    return JSON.parse(Buffer.from(sessionValue, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

/**
 * Write session cookies directly onto a NextResponse
 */
export function setSessionOnResponse(response: NextResponse, session: SessionData): void {
  const sessionValue = Buffer.from(JSON.stringify(session)).toString('base64');
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieAttrs = `; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${isProduction ? '; Secure' : ''}`;

  if (sessionValue.length <= CHUNK_SIZE) {
    response.headers.append('Set-Cookie', `${SESSION_COOKIE_PREFIX}=${sessionValue}${cookieAttrs}`);
  } else {
    const chunks = chunkString(sessionValue, CHUNK_SIZE);
    for (let i = 0; i < chunks.length; i++) {
      response.headers.append('Set-Cookie', `${SESSION_COOKIE_PREFIX}_${i}=${chunks[i]}${cookieAttrs}`);
    }
  }
}

/**
 * Clear session cookies on a response
 */
export function clearSessionOnResponse(response: NextResponse): void {
  const clearAttrs = '; Path=/; Max-Age=0';
  response.headers.append('Set-Cookie', `${SESSION_COOKIE_PREFIX}=${clearAttrs}`);
  for (let i = 0; i < 5; i++) {
    response.headers.append('Set-Cookie', `${SESSION_COOKIE_PREFIX}_${i}=${clearAttrs}`);
  }
}
