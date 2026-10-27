const WINDOW_MS = 60_000; // 1 minuto
const MAX_ATTEMPTS = 5;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const attemptsByIp = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

function cleanupExpired(now: number): void {
  if (attemptsByIp.size < 500) {
    return;
  }
  for (const [ip, entry] of attemptsByIp.entries()) {
    if (entry.resetAt <= now) {
      attemptsByIp.delete(ip);
    }
  }
}

export function consumeLoginAttempt(
  ip: string,
  now: number = Date.now(),
): RateLimitResult {
  cleanupExpired(now);

  const normalizedIp = ip.trim() || 'unknown';
  const existing = attemptsByIp.get(normalizedIp);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    attemptsByIp.set(normalizedIp, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      retryAfterSeconds: Math.ceil(WINDOW_MS / 1000),
    };
  }

  if (existing.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000),
    );
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, MAX_ATTEMPTS - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

export function resetLoginAttempts(ip: string): void {
  const normalizedIp = ip.trim() || 'unknown';
  attemptsByIp.delete(normalizedIp);
}

export function clearAllRateLimits(): void {
  attemptsByIp.clear();
}
