import { describe, expect, it, beforeEach } from 'vitest';
import {
  createSessionToken,
  verifyAdminPassword,
  verifySessionToken,
} from '../auth';
import {
  clearAllRateLimits,
  consumeLoginAttempt,
  resetLoginAttempts,
} from '../rate-limit';

describe('auth & session (jose)', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-secret-key-with-at-least-32-chars!!';
    process.env.ADMIN_PASSWORD = 'super-secret-password';
  });

  it('signs and verifies a valid session token', async () => {
    const token = await createSessionToken();
    expect(typeof token).toBe('string');
    const isValid = await verifySessionToken(token);
    expect(isValid).toBe(true);
  });

  it('rejects tampered or empty session tokens', async () => {
    expect(await verifySessionToken(null)).toBe(false);
    expect(await verifySessionToken('')).toBe(false);
    expect(await verifySessionToken('invalid.jwt.token')).toBe(false);
  });

  it('validates ADMIN_PASSWORD in constant time', () => {
    expect(verifyAdminPassword('super-secret-password')).toBe(true);
    expect(verifyAdminPassword('wrong-password')).toBe(false);
    expect(verifyAdminPassword('')).toBe(false);
  });
});

describe('rate limit (5 tentativas/min por IP)', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it('allows up to 5 attempts per minute for the same IP and blocks the 6th', () => {
    const ip = '192.168.1.10';
    const baseNow = 1_700_000_000_000;

    for (let i = 1; i <= 5; i++) {
      const res = consumeLoginAttempt(ip, baseNow + i * 100);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(5 - i);
    }

    const blocked = consumeLoginAttempt(ip, baseNow + 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    // outro IP continua permitido
    const otherIp = consumeLoginAttempt('192.168.1.11', baseNow + 1000);
    expect(otherIp.allowed).toBe(true);

    // após 1 minuto, libera novamente
    const afterWindow = consumeLoginAttempt(ip, baseNow + 61_000);
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.remaining).toBe(4);
  });

  it('resets attempts after successful login', () => {
    const ip = '10.0.0.5';
    consumeLoginAttempt(ip);
    consumeLoginAttempt(ip);
    resetLoginAttempts(ip);

    const res = consumeLoginAttempt(ip);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(4);
  });
});
