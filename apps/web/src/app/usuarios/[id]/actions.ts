'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  addAnimeByAnilistId,
  removeEntry,
  searchAnime,
  setProgress,
  setStatus,
} from '@animebot/core';
import type { AniListMedia, ListStatus } from '@/types/contracts';

const listStatusSchema = z.enum(['ASSISTINDO', 'QUERO_VER', 'COMPLETO']);

const addAnimeSchema = z.object({
  userId: z.string().min(1),
  anilistId: z.number().int().positive(),
  status: listStatusSchema,
});

const progressSchema = z.object({
  userId: z.string().min(1),
  entryId: z.string().min(1),
  episode: z.number().int().min(0, 'O episódio não pode ser negativo.'),
});

const statusUpdateSchema = z.object({
  userId: z.string().min(1),
  entryId: z.string().min(1),
  status: listStatusSchema,
});

export async function searchAnimeAction(
  query: string,
): Promise<AniListMedia[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }
  return searchAnime(trimmed, 5);
}

export async function addAnimeToUserListAction(
  userId: string,
  anilistId: number,
  status: ListStatus,
): Promise<void> {
  const parsed = addAnimeSchema.safeParse({ userId, anilistId, status });
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new Error(firstIssue?.message ?? 'Dados inválidos para adicionar anime.');
  }

  await addAnimeByAnilistId(parsed.data.anilistId, {
    userId: parsed.data.userId,
    status: parsed.data.status,
  });

  revalidatePath(`/usuarios/${userId}`);
  revalidatePath('/usuarios');
  revalidatePath('/animes');
  revalidatePath('/');
}

export async function setEntryProgressAction(
  userId: string,
  entryId: string,
  episode: number,
): Promise<void> {
  const parsed = progressSchema.safeParse({ userId, entryId, episode });
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new Error(firstIssue?.message ?? 'Episódio inválido.');
  }

  await setProgress(parsed.data.entryId, parsed.data.episode);
  revalidatePath(`/usuarios/${userId}`);
  revalidatePath('/animes');
}

export async function setEntryStatusAction(
  userId: string,
  entryId: string,
  status: ListStatus,
): Promise<void> {
  const parsed = statusUpdateSchema.safeParse({ userId, entryId, status });
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new Error(firstIssue?.message ?? 'Status inválido.');
  }

  await setStatus(parsed.data.entryId, parsed.data.status);
  revalidatePath(`/usuarios/${userId}`);
  revalidatePath('/animes');
}

export async function removeEntryAction(
  userId: string,
  entryId: string,
): Promise<void> {
  await removeEntry(entryId);
  revalidatePath(`/usuarios/${userId}`);
  revalidatePath('/usuarios');
  revalidatePath('/animes');
  revalidatePath('/');
}
