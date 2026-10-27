import { prisma } from '@animebot/db';
import type { ListStatus } from '@animebot/db';
import {
  AmbiguousEntryMatchError,
  EntryNotFoundError,
  InvalidEpisodeNumberError,
  UnauthorizedEntryAccessError,
} from '../errors.js';
import { normalizeSearchQuery } from '../utils/index.js';
import { findUserEntriesByTitle, getEntryById } from './list.js';
import type { ListEntryWithAnime } from './list.js';

export interface ProgressUpdateResult {
  entry: ListEntryWithAnime;
  /** true ao atingir anime.totalEpisodes com o status ainda diferente de COMPLETO. */
  reachedTotalEpisodes: boolean;
}

async function getOwnedEntry(entryId: string, actorUserId?: string): Promise<ListEntryWithAnime> {
  const entry = await getEntryById(entryId);
  if (actorUserId !== undefined && entry.userId !== actorUserId) {
    throw new UnauthorizedEntryAccessError(entryId, actorUserId);
  }
  return entry;
}

async function writeProgress(
  entry: ListEntryWithAnime,
  episode: number,
): Promise<ProgressUpdateResult> {
  await prisma.listEntry.update({ where: { id: entry.id }, data: { progress: episode } });
  const updated = await getEntryById(entry.id);
  const total = updated.anime.totalEpisodes;
  return {
    entry: updated,
    reachedTotalEpisodes: total !== null && episode === total && updated.status !== 'COMPLETO',
  };
}

export async function incrementProgress(
  entryId: string,
  actorUserId?: string,
): Promise<ProgressUpdateResult> {
  const entry = await getOwnedEntry(entryId, actorUserId);
  const total = entry.anime.totalEpisodes;
  const next = total === null ? entry.progress + 1 : Math.min(entry.progress + 1, total);
  return writeProgress(entry, next);
}

export async function setProgress(
  entryId: string,
  episode: number,
  actorUserId?: string,
): Promise<ProgressUpdateResult> {
  const entry = await getOwnedEntry(entryId, actorUserId);
  const total = entry.anime.totalEpisodes;
  if (!Number.isInteger(episode) || episode < 0 || (total !== null && episode > total)) {
    throw new InvalidEpisodeNumberError(episode, total);
  }
  return writeProgress(entry, episode);
}

export async function setStatus(
  entryId: string,
  status: ListStatus,
  actorUserId?: string,
): Promise<ListEntryWithAnime> {
  const entry = await getOwnedEntry(entryId, actorUserId);
  const total = entry.anime.totalEpisodes;
  await prisma.listEntry.update({
    where: { id: entryId },
    data: status === 'COMPLETO' && total !== null ? { status, progress: total } : { status },
  });
  return getEntryById(entryId);
}

export async function setProgressByTitle(
  userId: string,
  titleQuery: string,
  episode: number,
): Promise<ProgressUpdateResult> {
  const matches = await findUserEntriesByTitle(userId, titleQuery);
  const [first] = matches;
  if (!first) throw new EntryNotFoundError(titleQuery);

  let target = first;
  if (matches.length > 1) {
    const query = normalizeSearchQuery(titleQuery);
    const exact = matches.filter((entry) =>
      [entry.anime.titleEnglish, entry.anime.titleRomaji].some(
        (title) => title && normalizeSearchQuery(title) === query,
      ),
    );
    const [onlyExact] = exact;
    if (exact.length !== 1 || !onlyExact) throw new AmbiguousEntryMatchError(titleQuery, matches);
    target = onlyExact;
  }
  return setProgress(target.id, episode, userId);
}

export async function markEpisodeWatched(
  userId: string,
  animeId: string,
  episode: number,
): Promise<ProgressUpdateResult> {
  const entry = await prisma.listEntry.findUnique({
    where: { userId_animeId: { userId, animeId } },
    select: { id: true },
  });
  if (!entry) throw new EntryNotFoundError(animeId);
  return setProgress(entry.id, episode, userId);
}
