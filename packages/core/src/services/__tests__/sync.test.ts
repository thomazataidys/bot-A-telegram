import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  prisma: {
    anime: { upsert: vi.fn(), findMany: vi.fn() },
    airingEpisode: { upsert: vi.fn() },
    setting: { upsert: vi.fn() },
  },
}));
vi.mock('@animebot/db', () => db);
const anilist = vi.hoisted(() => ({ getAiringSchedules: vi.fn() }));
vi.mock('../../anilist/index.js', () => anilist);

import { AnimeNotFoundError, SyncAlreadyRunningError } from '../../errors.js';
import { isSyncInProgress, syncSingleAnime, syncTrackedAnimes } from '../sync.js';

interface UpsertArgs {
  create: { episode: number; notifiedAt: Date | null };
}

const NOW = new Date('2026-10-26T12:00:00Z');
const sec = (iso: string): number => Math.floor(new Date(iso).getTime() / 1000);

const media = {
  id: 100,
  idMal: 52299,
  title: { romaji: 'Ore dake Level Up na Ken', english: 'Solo Leveling' },
  bannerImage: 'https://img/banner.png',
  coverImage: {
    extraLarge: 'https://img/cover-xl.png',
    large: 'https://img/cover.png',
    color: '#e4a15d',
  },
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

  it('grava capa (extraLarge), banner e cor tanto no create quanto no update', async () => {
    await syncSingleAnime(100, NOW);

    const images = {
      coverUrl: 'https://img/cover-xl.png',
      bannerUrl: 'https://img/banner.png',
      coverColor: '#e4a15d',
    };
    expect(db.prisma.anime.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining(images),
        update: expect.objectContaining(images),
      }),
    );
  });

  it('usa a capa large quando não há extraLarge e limpa o banner ausente', async () => {
    anilist.getAiringSchedules.mockResolvedValue([
      {
        ...media,
        bannerImage: null,
        coverImage: { extraLarge: null, large: 'https://img/cover.png', color: null },
      },
    ]);
    await syncSingleAnime(100, NOW);

    expect(db.prisma.anime.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          coverUrl: 'https://img/cover.png',
          bannerUrl: null,
          coverColor: null,
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

describe('syncTrackedAnimes', () => {
  beforeEach(() => {
    db.prisma.anime.findMany.mockResolvedValue([{ anilistId: 100 }, { anilistId: 200 }]);
    anilist.getAiringSchedules.mockResolvedValue([
      media,
      { ...media, id: 200, airingSchedule: { nodes: [media.airingSchedule.nodes[2]] } },
    ]);
    db.prisma.anime.upsert.mockImplementation(({ where }: { where: { anilistId: number } }) =>
      Promise.resolve({ id: `a${where.anilistId}`, anilistId: where.anilistId }),
    );
  });

  it('busca só animes com ListEntry e sincroniza todos de uma vez', async () => {
    const result = await syncTrackedAnimes(NOW);

    expect(db.prisma.anime.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { entries: { some: {} } } }),
    );
    expect(anilist.getAiringSchedules).toHaveBeenCalledWith([100, 200]);
    expect(result).toMatchObject({ syncedAnimesCount: 2, upsertedEpisodesCount: 4 });
  });

  it('registra o horário do sync concluído', async () => {
    await syncTrackedAnimes(NOW);
    expect(db.prisma.setting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'lastSyncAt' } }),
    );
  });

  it('sem animes monitorados não chama a AniList', async () => {
    db.prisma.anime.findMany.mockResolvedValue([]);
    const result = await syncTrackedAnimes(NOW);
    expect(anilist.getAiringSchedules).not.toHaveBeenCalled();
    expect(result.syncedAnimesCount).toBe(0);
  });

  it('impede execuções concorrentes e libera o lock ao terminar ou falhar', async () => {
    let release: (value: unknown[]) => void = () => undefined;
    anilist.getAiringSchedules.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const first = syncTrackedAnimes(NOW);
    await vi.waitFor(() => expect(isSyncInProgress()).toBe(true));
    await expect(syncTrackedAnimes(NOW)).rejects.toBeInstanceOf(SyncAlreadyRunningError);

    release([]);
    await first;
    expect(isSyncInProgress()).toBe(false);

    anilist.getAiringSchedules.mockRejectedValueOnce(new Error('boom'));
    await expect(syncTrackedAnimes(NOW)).rejects.toThrow('boom');
    expect(isSyncInProgress()).toBe(false);
  });
});
