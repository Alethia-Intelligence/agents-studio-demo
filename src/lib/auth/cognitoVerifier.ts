interface JWK {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n: string;
  e: string;
}

interface JWTPayload {
  sub: string;
  email?: string;
  name?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  [key: string]: unknown;
}

function getJwksUri(): string {
  return `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeJwt(token: string): {
  header: { alg: string; kid: string };
  payload: JWTPayload;
  signature: Uint8Array;
  signedPart: string;
} {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));
  const signature = base64UrlDecode(parts[2]);
  const signedPart = parts[0] + '.' + parts[1];

  return { header, payload, signature, signedPart };
}

async function importRsaPublicKey(jwk: JWK): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    true,
    ['verify']
  );
}

async function fetchJwks(): Promise<{ keys: JWK[] }> {
  const response = await fetch(getJwksUri(), { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Failed to fetch JWKS: ${response.status}`);
  return response.json();
}

function getIssuer(): string {
  return `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;
}

async function verifyToken(token: string, validateAudience: boolean): Promise<JWTPayload | null> {
  try {
    const { header, payload, signature, signedPart } = decodeJwt(token);

    if (header.alg !== 'RS256') return null;

    const jwks = await fetchJwks();
    const jwk = jwks.keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;

    const publicKey = await importRsaPublicKey(jwk);
    const data = new TextEncoder().encode(signedPart);
    const isValid = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      publicKey,
      signature.buffer as ArrayBuffer,
      data
    );
    if (!isValid) return null;

    const now = Math.floor(Date.now() / 1000);

    if (payload.iss !== getIssuer()) return null;
    if (validateAudience) {
      const aud = payload.aud;
      const clientId = process.env.COGNITO_CLIENT_ID!;
      const audMatch = Array.isArray(aud) ? aud.includes(clientId) : aud === clientId;
      if (!audMatch) return null;
    }
    if (payload.exp && payload.exp < now) return null;
    if (payload.nbf && payload.nbf > now) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function verifyIdToken(token: string): Promise<JWTPayload | null> {
  return verifyToken(token, true);
}

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  return verifyToken(token, false);
}
