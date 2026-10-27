'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  createUserFromPanel,
  deleteUser,
  setUserActive,
  updateUser,
} from '@animebot/core';
import type {
  CreatePanelUserInput,
  UpdateUserInput,
} from '@/types/contracts';

const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome do usuário é obrigatório.')
    .max(80, 'O nome deve ter no máximo 80 caracteres.'),
  username: z
    .string()
    .trim()
    .transform((val) => val.replace(/^@+/, '').toLowerCase())
    .refine(
      (val) => val === '' || /^[a-z0-9_]{3,32}$/.test(val),
      'O @username deve ter entre 3 e 32 caracteres (letras, números ou _).',
    )
    .nullable()
    .optional(),
  active: z.boolean().optional(),
});

const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome do usuário não pode ficar vazio.')
    .max(80, 'O nome deve ter no máximo 80 caracteres.')
    .optional(),
  username: z
    .string()
    .trim()
    .transform((val) => val.replace(/^@+/, '').toLowerCase())
    .refine(
      (val) => val === '' || /^[a-z0-9_]{3,32}$/.test(val),
      'O @username deve ter entre 3 e 32 caracteres (letras, números ou _).',
    )
    .nullable()
    .optional(),
  active: z.boolean().optional(),
});

export async function createUserAction(
  input: CreatePanelUserInput,
): Promise<void> {
  const parsed = createUserSchema.safeParse({
    name: input.name,
    username: input.username ?? '',
    active: input.active,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new Error(firstIssue?.message ?? 'Dados inválidos.');
  }

  await createUserFromPanel({
    name: parsed.data.name,
    username:
      parsed.data.username && parsed.data.username.length > 0
        ? parsed.data.username
        : null,
    active: parsed.data.active ?? true,
  });

  revalidatePath('/usuarios');
  revalidatePath('/animes');
  revalidatePath('/');
}

export async function updateUserAction(
  userId: string,
  input: UpdateUserInput,
): Promise<void> {
  const parsed = updateUserSchema.safeParse({
    name: input.name,
    username: input.username ?? '',
    active: input.active,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new Error(firstIssue?.message ?? 'Dados inválidos.');
  }

  await updateUser(userId, {
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(input.username !== undefined
      ? {
          username:
            parsed.data.username && parsed.data.username.length > 0
              ? parsed.data.username
              : null,
        }
      : {}),
    ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
  });

  revalidatePath('/usuarios');
  revalidatePath(`/usuarios/${userId}`);
  revalidatePath('/animes');
}

export async function toggleUserActiveAction(
  userId: string,
  active: boolean,
): Promise<void> {
  await setUserActive(userId, active);
  revalidatePath('/usuarios');
  revalidatePath(`/usuarios/${userId}`);
  revalidatePath('/animes');
  revalidatePath('/');
}

export async function deleteUserAction(userId: string): Promise<void> {
  await deleteUser(userId);
  revalidatePath('/usuarios');
  revalidatePath('/animes');
  revalidatePath('/');
}
