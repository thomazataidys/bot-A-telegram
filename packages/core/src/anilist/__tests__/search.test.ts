import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ searchAnime: vi.fn() }));
vi.mock('../client.js', () => client);

import {
  prioritizeSeason,
  queryFallbacks,
  searchAnimeForSeason,
  searchAnimeWithFallback,
  seasonScore,
} from '../search.js';
import type { AniListMedia } from '../types.js';

const media = (id: number, romaji: string, english: string | null = null): AniListMedia => ({
  id,
  idMal: null,
  title: { romaji, english },
  bannerImage: null,
  coverImage: { extraLarge: null, large: null, color: null },
  siteUrl: `https://anilist.co/anime/${id}`,
  format: 'TV',
  status: 'FINISHED',
  episodes: 12,
  nextAiringEpisode: null,
});

const s1 = media(1, 'Ore dake Level Up na Ken', 'Solo Leveling');
const s2 = media(2, 'Ore dake Level Up na Ken: Season 2 - Arise from the Shadow', 'Solo Leveling Season 2');
const part2 = media(3, 'Some Show Part 2');
const third = media(4, 'Some Show 3rd Season');

beforeEach(() => vi.resetAllMocks());

describe('queryFallbacks', () => {
  it('devolve a query e as versões antes da vírgula e dos dois-pontos, sem repetir', () => {
    expect(queryFallbacks('Mushoku Tensei, Part 2: Jobless')).toEqual([
      'Mushoku Tensei, Part 2: Jobless',
      'Mushoku Tensei',
      'Mushoku Tensei, Part 2',
    ]);
    expect(queryFallbacks('Solo Leveling')).toEqual(['Solo Leveling']);
  });

  it('ignora trechos curtos demais', () => {
    expect(queryFallbacks('Re:Zero')).toEqual(['Re:Zero']);
  });
});

describe('searchAnimeWithFallback', () => {
  it('só encurta a query quando a anterior não retorna nada', async () => {
    client.searchAnime.mockResolvedValueOnce([]).mockResolvedValueOnce([s1]);
    await expect(searchAnimeWithFallback('Solo Leveling, Extra', 3)).resolves.toEqual([s1]);
    expect(client.searchAnime).toHaveBeenNthCalledWith(1, 'Solo Leveling, Extra', 3);
    expect(client.searchAnime).toHaveBeenNthCalledWith(2, 'Solo Leveling', 3);
  });

  it('não repete a busca se a primeira já achou', async () => {
    client.searchAnime.mockResolvedValue([s1]);
    await searchAnimeWithFallback('Solo Leveling: X', 3);
    expect(client.searchAnime).toHaveBeenCalledTimes(1);
  });

  it('devolve vazio quando nenhuma tentativa acha', async () => {
    client.searchAnime.mockResolvedValue([]);
    await expect(searchAnimeWithFallback('Nada, aqui: x', 3)).resolves.toEqual([]);
    expect(client.searchAnime).toHaveBeenCalledTimes(3);
  });
});

describe('priorização de temporada', () => {
  it('pontua Season N, Nth Season e Part', () => {
    expect(seasonScore(s2, 2)).toBe(2);
    expect(seasonScore(media(9, 'X 2nd Season'), 2)).toBe(2);
    expect(seasonScore(third, 3)).toBe(2);
    expect(seasonScore(part2, 2)).toBe(1);
    expect(seasonScore(s1, 2)).toBe(0);
    expect(seasonScore(third, 2)).toBe(0);
  });

  it('põe a temporada pedida primeiro, depois Part, mantendo a ordem original no empate', () => {
    expect(prioritizeSeason([s1, part2, s2], 2).map((m) => m.id)).toEqual([2, 3, 1]);
  });
});

describe('searchAnimeForSeason', () => {
  it('sem temporada (ou 1) faz uma busca simples', async () => {
    client.searchAnime.mockResolvedValue([s1]);
    await searchAnimeForSeason('Solo Leveling', 1, 3);
    expect(client.searchAnime).toHaveBeenCalledTimes(1);
  });

  it('temporada > 1: busca também "<título> Season N", mescla sem duplicar e prioriza', async () => {
    client.searchAnime.mockImplementation((query: string) =>
      Promise.resolve(query === 'Solo Leveling' ? [s1, s2] : [s2]),
    );
    const results = await searchAnimeForSeason('Solo Leveling', 2, 3);
    expect(client.searchAnime).toHaveBeenCalledWith('Solo Leveling Season 2', 3);
    expect(results.map((m) => m.id)).toEqual([2, 1]);
  });
});
