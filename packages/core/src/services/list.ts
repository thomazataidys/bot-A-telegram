import { prisma } from '@animebot/db';
import type { AiringEpisode, Anime, ListEntry, ListStatus, User } from '@animebot/db';
import { getAnimeByMalId } from '../anilist/index.js';
import {
  AnimeAlreadyInListError,
  AnimeNotFoundError,
  EntryNotFoundError,
  UnauthorizedEntryAccessError,
  UserNotFoundError,
} from '../errors.js';
import { displayTitle, normalizeSearchQuery } from '../utils/index.js';
import { syncSingleAnime } from './sync.js';
import { getUserByUsername } from './users.js';

export type ListEntryWithAnime = ListEntry & {
  anime: Anime & { nextEpisode: AiringEpisode | null };
};

export interface GroupedUserList {
  user: User;
  ASSISTINDO: ListEntryWithAnime[];
  QUERO_VER: ListEntryWithAnime[];
  COMPLETO: ListEntryWithAnime[];
  totalCount: number;
}

export interface GlobalAnimeWatcher {
  user: Pick<User, 'id' | 'name' | 'username' | 'telegramId' | 'active'>;
  entryId: string;
  status: ListStatus;
  progress: number;
}

export interface GlobalAnimeItem {
  anime: Anime;
  displayTitle: string;
  nextEpisode: AiringEpisode | null;
  watchers: GlobalAnimeWatcher[];
}

export interface GlobalListFilter {
  userId?: string;
  listStatus?: ListStatus;
  /** Status do anime na AniList, ex.: 'RELEASING', 'FINISHED'. */
  animeStatus?: string;
  search?: string;
}

export interface AddAnimeOptions {
  userId: string;
  status?: ListStatus;
  initialProgress?: number;
}

/** Inclui o próximo episódio (primeiro com airingAt no futuro) junto do anime. */
function entryInclude(now: Date = new Date()) {
  return {
    anime: {
      include: {
        episodes: {
          where: { airingAt: { gt: now } },
          orderBy: { airingAt: 'asc' as const },
          take: 1,
        },
      },
    },
  };
}

type RawEntry = ListEntry & { anime: Anime & { episodes: AiringEpisode[] } };

function toEntryWithAnime(raw: RawEntry): ListEntryWithAnime {
  const { episodes, ...anime } = raw.anime;
  return { ...raw, anime: { ...anime, nextEpisode: episodes[0] ?? null } };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}

async function findEntry(userId: string, animeId: string): Promise<ListEntryWithAnime | null> {
  const raw = await prisma.listEntry.findUnique({
    where: { userId_animeId: { userId, animeId } },
    include: entryInclude(),
  });
  return raw ? toEntryWithAnime(raw) : null;
}

async function addExistingOrSyncedAnime(
  anilistId: number,
  existing: Anime | null,
  options: AddAnimeOptions,
): Promise<ListEntryWithAnime> {
  const user = await prisma.user.findUnique({ where: { id: options.userId } });
  if (!user) throw new UserNotFoundError(options.userId);

  // Anime órfão (nunca sincronizado) não tem AiringEpisode: sincroniza antes de adicionar.
  const anime =
    existing && existing.lastSyncedAt !== null ? existing : await syncSingleAnime(anilistId);

  const already = await findEntry(user.id, anime.id);
  if (already) throw new AnimeAlreadyInListError(already);

  try {
    const raw = await prisma.listEntry.create({
      data: {
        userId: user.id,
        animeId: anime.id,
        status: options.status ?? 'ASSISTINDO',
        progress: options.initialProgress ?? 0,
      },
      include: entryInclude(),
    });
    return toEntryWithAnime(raw);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const concurrent = await findEntry(user.id, anime.id);
      if (concurrent) throw new AnimeAlreadyInListError(concurrent);
    }
    throw error;
  }
}

export async function addAnimeByAnilistId(
  anilistId: number,
  options: AddAnimeOptions,
): Promise<ListEntryWithAnime> {
  const existing = await prisma.anime.findUnique({ where: { anilistId } });
  return addExistingOrSyncedAnime(anilistId, existing, options);
}

export async function addAnimeByMalId(
  malId: number,
  options: AddAnimeOptions,
): Promise<ListEntryWithAnime> {
  const existing = await prisma.anime.findFirst({ where: { malId } });
  if (existing) return addExistingOrSyncedAnime(existing.anilistId, existing, options);

  const media = await getAnimeByMalId(malId);
  if (!media) throw new AnimeNotFoundError(`MAL ${malId}`);
  const byAnilistId = await prisma.anime.findUnique({ where: { anilistId: media.id } });
  return addExistingOrSyncedAnime(media.id, byAnilistId, options);
}

export async function getEntryById(entryId: string): Promise<ListEntryWithAnime> {
  const raw = await prisma.listEntry.findUnique({
    where: { id: entryId },
    include: entryInclude(),
  });
  if (!raw) throw new EntryNotFoundError(entryId);
  return toEntryWithAnime(raw);
}

export async function getUserList(userId: string): Promise<GroupedUserList> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UserNotFoundError(userId);

  const raws = await prisma.listEntry.findMany({ where: { userId }, include: entryInclude() });
  const entries = raws
    .map(toEntryWithAnime)
    .sort((a, b) => displayTitle(a.anime).localeCompare(displayTitle(b.anime), 'pt-BR'));

  const grouped: GroupedUserList = {
    user,
    ASSISTINDO: [],
    QUERO_VER: [],
    COMPLETO: [],
    totalCount: 0,
  };
  for (const entry of entries) grouped[entry.status].push(entry);
  grouped.totalCount = entries.length;
  return grouped;
}

export async function getUserListByUsername(username: string): Promise<GroupedUserList> {
  const user = await getUserByUsername(username);
  return getUserList(user.id);
}

export async function getGlobalList(filter: GlobalListFilter = {}): Promise<GlobalAnimeItem[]> {
  const search = filter.search?.trim();
  const raws = await prisma.listEntry.findMany({
    where: {
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.listStatus ? { status: filter.listStatus } : {}),
      anime: {
        ...(filter.animeStatus ? { status: filter.animeStatus } : {}),
        ...(search
          ? {
              OR: [
                { titleEnglish: { contains: search, mode: 'insensitive' as const } },
                { titleRomaji: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
    },
    include: { ...entryInclude(), user: true },
  });

  const items = new Map<string, GlobalAnimeItem>();
  for (const raw of raws) {
    const { user, ...rawEntry } = raw;
    const entry = toEntryWithAnime(rawEntry);
    const { nextEpisode, ...anime } = entry.anime;
    let item = items.get(anime.id);
    if (!item) {
      item = { anime, displayTitle: displayTitle(anime), nextEpisode, watchers: [] };
      items.set(anime.id, item);
    }
    item.watchers.push({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        telegramId: user.telegramId,
        active: user.active,
      },
      entryId: entry.id,
      status: entry.status,
      progress: entry.progress,
    });
  }

  return [...items.values()]
    .map((item) => ({
      ...item,
      watchers: item.watchers.sort((a, b) => a.user.name.localeCompare(b.user.name, 'pt-BR')),
    }))
    .sort((a, b) => a.displayTitle.localeCompare(b.displayTitle, 'pt-BR'));
}

/** Entradas do usuário cujo título (english ou romaji) contém a busca; match exato primeiro. */
export async function findUserEntriesByTitle(
  userId: string,
  titleQuery: string,
): Promise<ListEntryWithAnime[]> {
  const query = normalizeSearchQuery(titleQuery);
  if (query === '') return [];

  const raws = await prisma.listEntry.findMany({ where: { userId }, include: entryInclude() });
  const titlesOf = (entry: ListEntryWithAnime): string[] =>
    [entry.anime.titleEnglish, entry.anime.titleRomaji]
      .filter((t): t is string => !!t)
      .map(normalizeSearchQuery);

  const matches = raws
    .map(toEntryWithAnime)
    .filter((entry) => titlesOf(entry).some((title) => title.includes(query)));
  const isExact = (entry: ListEntryWithAnime): boolean => titlesOf(entry).includes(query);

  return matches.sort(
    (a, b) =>
      Number(isExact(b)) - Number(isExact(a)) ||
      displayTitle(a.anime).localeCompare(displayTitle(b.anime), 'pt-BR'),
  );
}

export async function removeEntry(
  entryId: string,
  actorUserId?: string,
): Promise<ListEntryWithAnime> {
  const entry = await getEntryById(entryId);
  if (actorUserId !== undefined && entry.userId !== actorUserId) {
    throw new UnauthorizedEntryAccessError(entryId, actorUserId);
  }
  await prisma.listEntry.delete({ where: { id: entryId } });
  return entry;
}
