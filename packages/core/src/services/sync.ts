import { prisma } from '@animebot/db';
import type { Anime } from '@animebot/db';
import { getAiringSchedules } from '../anilist/index.js';
import type { AniListAiringMedia } from '../anilist/index.js';
import { AnimeNotFoundError, SyncAlreadyRunningError } from '../errors.js';
import { recordSyncFinished } from './runtime-status.js';

/** Episódios que já tinham saído há mais que isto não geram aviso (regra 7.1.4). */
const STALE_EPISODE_MS = 24 * 60 * 60 * 1000;

export interface SyncResult {
  syncedAnimesCount: number;
  upsertedEpisodesCount: number;
  startedAt: Date;
  finishedAt: Date;
}

/** Cria/atualiza o Anime e faz upsert dos AiringEpisodes de uma mídia da AniList. */
async function applyMedia(
  media: AniListAiringMedia,
  now: Date,
): Promise<{ anime: Anime; episodes: number }> {
  const fields = {
    malId: media.idMal,
    titleEnglish: media.title.english,
    titleRomaji: media.title.romaji,
    // Imagens sempre atualizadas, inclusive de animes já cadastrados.
    coverUrl: media.coverImage.extraLarge ?? media.coverImage.large,
    bannerUrl: media.bannerImage,
    coverColor: media.coverImage.color,
    siteUrl: media.siteUrl,
    format: media.format,
    status: media.status,
    totalEpisodes: media.episodes,
    lastSyncedAt: now,
  };
  const anime = await prisma.anime.upsert({
    where: { anilistId: media.id },
    create: { anilistId: media.id, ...fields },
    update: fields,
  });

  const staleBefore = now.getTime() - STALE_EPISODE_MS;
  for (const node of media.airingSchedule.nodes) {
    const airingAt = new Date(node.airingAt * 1000);
    await prisma.airingEpisode.upsert({
      where: { animeId_episode: { animeId: anime.id, episode: node.episode } },
      create: {
        animeId: anime.id,
        episode: node.episode,
        airingAt,
        notifiedAt: airingAt.getTime() < staleBefore ? now : null,
      },
      // Adiamentos mudam airingAt; notifiedAt é preservado.
      update: { airingAt },
    });
  }
  return { anime, episodes: media.airingSchedule.nodes.length };
}

/**
 * Sincroniza um anime com a AniList (cria/atualiza o Anime e faz upsert dos AiringEpisodes).
 * Episódios novos com airingAt < now - 24h já nascem com notifiedAt = now.
 */
export async function syncSingleAnime(anilistId: number, now: Date = new Date()): Promise<Anime> {
  const [media] = (await getAiringSchedules([anilistId])).filter((m) => m.id === anilistId);
  if (!media) throw new AnimeNotFoundError(anilistId);
  return (await applyMedia(media, now)).anime;
}

let syncing = false;

/** Indica se há uma sincronização em andamento neste processo. */
export function isSyncInProgress(): boolean {
  return syncing;
}

/**
 * Sincroniza todos os animes que estão em pelo menos uma ListEntry (seção 7.1).
 * A busca na AniList já é feita em lotes por getAiringSchedules.
 * @throws {SyncAlreadyRunningError | AniListApiError}
 */
export async function syncTrackedAnimes(now: Date = new Date()): Promise<SyncResult> {
  if (syncing) throw new SyncAlreadyRunningError();
  syncing = true;
  try {
    const startedAt = new Date();
    const tracked = await prisma.anime.findMany({
      where: { entries: { some: {} } },
      select: { anilistId: true },
    });

    let syncedAnimesCount = 0;
    let upsertedEpisodesCount = 0;
    if (tracked.length > 0) {
      const medias = await getAiringSchedules(tracked.map((anime) => anime.anilistId));
      for (const media of medias) {
        const { episodes } = await applyMedia(media, now);
        syncedAnimesCount += 1;
        upsertedEpisodesCount += episodes;
      }
    }

    const finishedAt = new Date();
    await recordSyncFinished(finishedAt);
    return { syncedAnimesCount, upsertedEpisodesCount, startedAt, finishedAt };
  } finally {
    syncing = false;
  }
}
