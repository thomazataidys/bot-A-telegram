'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  createSessionToken,
  verifyAdminPassword,
} from '@/lib/auth';
import { consumeLoginAttempt, resetLoginAttempts } from '@/lib/rate-limit';

export interface LoginActionState {
  error?: string;
}

const loginSchema = z.object({
  password: z.string().min(1, 'Digite a senha de administrador.'),
});

async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  const forwardedFor = hdrs.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }
  const realIp = hdrs.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }
  return '127.0.0.1';
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const ip = await getClientIp();
  const rateLimit = consumeLoginAttempt(ip);

  if (!rateLimit.allowed) {
    return {
      error: `Muitas tentativas. Aguarde ${rateLimit.retryAfterSeconds} segundos antes de tentar novamente.`,
    };
  }

  const parsed = loginSchema.safeParse({
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      error: firstIssue?.message ?? 'Dados inválidos.',
    };
  }

  if (!process.env.ADMIN_PASSWORD) {
    return {
      error: 'A senha de administrador (ADMIN_PASSWORD) não foi configurada no servidor.',
    };
  }

  const isValid = verifyAdminPassword(parsed.data.password);
  if (!isValid) {
    return {
      error: `Senha incorreta. Tentativas restantes neste minuto: ${rateLimit.remaining}.`,
    };
  }

  resetLoginAttempts(ip);

  const token = await createSessionToken();
  const hdrs = await headers();
  // TODO(security): Forçar secure: true quando HTTPS estiver configurado; acesso local via Tailscale usa HTTP (http://thomazlab:3000)
  const isSecure =
    hdrs.get('x-forwarded-proto') === 'https' ||
    process.env.COOKIE_SECURE === 'true';

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
    secure: isSecure,
  });

  redirect('/');
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/login');
}
