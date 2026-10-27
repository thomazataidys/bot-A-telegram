import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  prisma: {
    anime: { upsert: vi.fn() },
    airingEpisode: { upsert: vi.fn() },
  },
}));
vi.mock('@animebot/db', () => db);
const anilist = vi.hoisted(() => ({ getAiringSchedules: vi.fn() }));
vi.mock('../../anilist/index.js', () => anilist);

import { AnimeNotFoundError } from '../../errors.js';
import { syncSingleAnime } from '../sync.js';

interface UpsertArgs {
  create: { episode: number; notifiedAt: Date | null };
}

const NOW = new Date('2026-10-26T12:00:00Z');
const sec = (iso: string): number => Math.floor(new Date(iso).getTime() / 1000);

const media = {
  id: 100,
  idMal: 52299,
  title: { romaji: 'Ore dake Level Up na Ken', english: 'Solo Leveling' },
  coverImage: { large: 'https://img/cover.png' },
  siteUrl: 'https://anilist.co/anime/100',
  format: 'TV',
  status: 'RELEASING',
  episodes: 12,
  nextAiringEpisode: null,
  airingSchedule: {
    nodes: [
      { episode: 1, airingAt: sec('2026-10-10T12:00:00Z') }, // > 24h atrás
      { episode: 2, airingAt: sec('2026-10-26T06:00:00Z') }, // 6h atrás
      { episode: 3, airingAt: sec('2026-11-02T12:00:00Z') }, // futuro
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  anilist.getAiringSchedules.mockResolvedValue([media]);
  db.prisma.anime.upsert.mockResolvedValue({ id: 'a1', anilistId: 100 });
});

describe('syncSingleAnime', () => {
  it('faz upsert do anime com os dados da AniList', async () => {
    const anime = await syncSingleAnime(100, NOW);

    expect(anime).toEqual({ id: 'a1', anilistId: 100 });
    expect(db.prisma.anime.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { anilistId: 100 },
        create: expect.objectContaining({
          anilistId: 100,
          malId: 52299,
          titleEnglish: 'Solo Leveling',
          titleRomaji: 'Ore dake Level Up na Ken',
          totalEpisodes: 12,
          lastSyncedAt: NOW,
        }),
      }),
    );
  });

  it('marca notifiedAt = now só em episódios com airingAt < now - 24h (regra 7.1.4)', async () => {
    await syncSingleAnime(100, NOW);

    const created = Object.fromEntries(
      (db.prisma.airingEpisode.upsert.mock.calls as [UpsertArgs][]).map(([args]) => [
        args.create.episode,
        args.create.notifiedAt,
      ]),
    );
    expect(created).toEqual({ 1: NOW, 2: null, 3: null });
  });

  it('atualiza airingAt de episódios existentes (adiamento) sem tocar em notifiedAt', async () => {
    await syncSingleAnime(100, NOW);
    expect(db.prisma.airingEpisode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { animeId_episode: { animeId: 'a1', episode: 3 } },
        update: { airingAt: new Date('2026-11-02T12:00:00Z') },
      }),
    );
  });

  it('lança AnimeNotFoundError quando a AniList não retorna o anime', async () => {
    anilist.getAiringSchedules.mockResolvedValue([]);
    await expect(syncSingleAnime(100, NOW)).rejects.toBeInstanceOf(AnimeNotFoundError);
    expect(db.prisma.anime.upsert).not.toHaveBeenCalled();
  });
});
