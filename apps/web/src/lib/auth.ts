import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE_NAME = 'animebot_session';
export const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 dias

let ephemeralSecret: Uint8Array | null = null;

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.trim().length > 0) {
    return new TextEncoder().encode(secret);
  }
  if (!ephemeralSecret) {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    ephemeralSecret = randomBytes;
    console.warn(
      '[animebot/web] SESSION_SECRET não definido; usando segredo efêmero em memória.',
    );
  }
  return ephemeralSecret;
}

/**
 * Comparação em tempo constante compatível com Edge e Node.js
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  const maxLen = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;

  for (let i = 0; i < maxLen; i++) {
    const byteA = aBytes[i] ?? 0;
    const byteB = bBytes[i] ?? 0;
    diff |= byteA ^ byteB;
  }

  return diff === 0 && aBytes.length > 0;
}

export function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length === 0) {
    return false;
  }
  return constantTimeEqual(password, adminPassword);
}

export async function createSessionToken(): Promise<string> {
  const secretKey = getSecretKey();
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey);
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) {
    return false;
  }
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    return payload.role === 'admin';
  } catch {
    return false;
  }
}
