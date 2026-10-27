import { prisma } from '@animebot/db';
import type { Anime } from '@animebot/db';
import { getAiringSchedules } from '../anilist/index.js';
import { AnimeNotFoundError } from '../errors.js';

/** Episódios que já tinham saído há mais que isto não geram aviso (regra 7.1.4). */
const STALE_EPISODE_MS = 24 * 60 * 60 * 1000;

/**
 * Sincroniza um anime com a AniList (cria/atualiza o Anime e faz upsert dos AiringEpisodes).
 * Episódios novos com airingAt < now - 24h já nascem com notifiedAt = now.
 */
export async function syncSingleAnime(anilistId: number, now: Date = new Date()): Promise<Anime> {
  const [media] = (await getAiringSchedules([anilistId])).filter((m) => m.id === anilistId);
  if (!media) throw new AnimeNotFoundError(anilistId);

  const fields = {
    malId: media.idMal,
    titleEnglish: media.title.english,
    titleRomaji: media.title.romaji,
    coverUrl: media.coverImage.large,
    siteUrl: media.siteUrl,
    format: media.format,
    status: media.status,
    totalEpisodes: media.episodes,
    lastSyncedAt: now,
  };
  const anime = await prisma.anime.upsert({
    where: { anilistId },
    create: { anilistId, ...fields },
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
      update: { airingAt },
    });
  }
  return anime;
}
