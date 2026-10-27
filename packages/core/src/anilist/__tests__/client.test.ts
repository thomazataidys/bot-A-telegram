import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AniListApiError, AniListRateLimitError } from '../../errors.js';
import {
  createAniListClient,
  getAiringSchedules,
  getAnimeById,
  getAnimeByMalId,
  searchAnime,
} from '../client.js';

const NOW = 1_800_000_000;

const rawMedia = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  idMal: id + 1000,
  title: { romaji: `Romaji ${id}`, english: id % 2 === 0 ? `English ${id}` : null },
  coverImage: { large: `https://img/${id}.jpg` },
  siteUrl: `https://anilist.co/anime/${id}`,
  format: 'TV',
  status: 'RELEASING',
  episodes: 12,
  nextAiringEpisode: { episode: 5, airingAt: NOW + 3600 },
  ...overrides,
});

const json = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

const fetchMock = vi.fn<typeof fetch>();
const sleep = vi.fn<(ms: number) => Promise<void>>(() => Promise.resolve());
const client = createAniListClient({ sleep, now: () => NOW });

const lastBody = (call = -1): { query: string; variables: Record<string, unknown> } => {
  const calls = fetchMock.mock.calls;
  const init = calls.at(call)?.[1];
  return JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> };
};

beforeEach(() => {
  fetchMock.mockReset();
  sleep.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchAnime', () => {
  it('valida com Zod e mapeia títulos e capa', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        data: { Page: { media: [rawMedia(1), rawMedia(2, { idMal: null, format: null })] } },
      }),
    );

    const result = await searchAnime('solo leveling', 3);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 1,
      idMal: 1001,
      title: { romaji: 'Romaji 1', english: null },
      coverImage: { large: 'https://img/1.jpg' },
      nextAiringEpisode: { episode: 5, airingAt: NOW + 3600 },
    });
    expect(result[1]).toMatchObject({ title: { english: 'English 2' }, idMal: null, format: null });
    expect(lastBody().variables).toEqual({ search: 'solo leveling', perPage: 3 });
  });

  it('usa limit padrão 5', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { Page: { media: [] } } }));
    expect(await searchAnime('x')).toEqual([]);
    expect(lastBody().variables).toMatchObject({ perPage: 5 });
  });

  it('normaliza coverImage e campos opcionais ausentes', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        data: {
          Page: {
            media: [rawMedia(3, { coverImage: null, episodes: null, nextAiringEpisode: null })],
          },
        },
      }),
    );
    const [media] = await searchAnime('x');
    expect(media).toMatchObject({
      coverImage: { large: null },
      episodes: null,
      nextAiringEpisode: null,
    });
  });
});

describe('getAnimeById / getAnimeByMalId', () => {
  it('retorna a mídia quando encontrada', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { Media: rawMedia(7) } }));
    expect(await getAnimeById(7)).toMatchObject({ id: 7 });
    expect(lastBody().variables).toEqual({ id: 7 });

    fetchMock.mockResolvedValueOnce(json({ data: { Media: rawMedia(7) } }));
    expect(await getAnimeByMalId(1007)).toMatchObject({ id: 7, idMal: 1007 });
    expect(lastBody().variables).toEqual({ idMal: 1007 });
    expect(lastBody().query).toContain('idMal: $idMal');
  });

  it('retorna null quando a API responde HTTP 404', async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        { data: { Media: null }, errors: [{ message: 'Not Found.', status: 404 }] },
        { status: 404 },
      ),
    );
    expect(await getAnimeById(999)).toBeNull();
  });

  it('retorna null quando o erro GraphQL tem status 404 (HTTP 200)', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ data: null, errors: [{ message: 'Not Found.', status: 404 }] }),
    );
    expect(await getAnimeByMalId(999)).toBeNull();
  });

  it('retorna null quando Media vem null', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { Media: null } }));
    expect(await getAnimeById(999)).toBeNull();
  });

  it('lança AniListApiError em erro 500', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ errors: [{ message: 'boom', status: 500 }] }, { status: 500 }),
    );
    await expect(getAnimeById(1)).rejects.toMatchObject({
      code: 'ANILIST_API_ERROR',
      statusCode: 500,
    });
  });
});

describe('getAiringSchedules', () => {
  const airingResponse = (ids: number[], recent: unknown[] = []) =>
    json({
      data: {
        media: {
          media: ids.map((id) =>
            rawMedia(id, {
              airingSchedule: {
                nodes: [
                  { episode: 5, airingAt: NOW + 3600 },
                  { episode: 6, airingAt: NOW + 7200 },
                ],
              },
            }),
          ),
        },
        recent: { airingSchedules: recent },
      },
    });

  it('divide 60 IDs em lotes de 50 e 10 e mescla os resultados', async () => {
    const ids = Array.from({ length: 60 }, (_, i) => i + 1);
    fetchMock.mockImplementation((_url, init) => {
      const { variables } = JSON.parse(String(init?.body)) as { variables: { ids: number[] } };
      return Promise.resolve(airingResponse(variables.ids));
    });

    const result = await client.getAiringSchedules(ids);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((lastBody(0).variables['ids'] as number[]).length).toBe(50);
    expect((lastBody(1).variables['ids'] as number[]).length).toBe(10);
    expect(result.map((m) => m.id)).toEqual(ids);
  });

  it('a função exportada usa o fetch global', async () => {
    fetchMock.mockResolvedValueOnce(airingResponse([1]));
    expect(await getAiringSchedules([1])).toHaveLength(1);
  });

  it('não faz requisição para lista vazia e remove IDs duplicados', async () => {
    expect(await client.getAiringSchedules([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(airingResponse([1, 2]));
    await client.getAiringSchedules([1, 2, 1, 2]);
    expect(lastBody().variables['ids']).toEqual([1, 2]);
  });

  it('inclui o episódio recém-exibido, sem duplicar, ordenado por episódio', async () => {
    fetchMock.mockResolvedValueOnce(
      airingResponse(
        [1],
        [
          { mediaId: 1, episode: 4, airingAt: NOW - 600 },
          { mediaId: 1, episode: 5, airingAt: NOW + 3600 }, // duplicado de notYetAired
          { mediaId: 2, episode: 9, airingAt: NOW - 100 }, // outra mídia
        ],
      ),
    );

    const [media] = await client.getAiringSchedules([1]);

    expect(media?.airingSchedule.nodes).toEqual([
      { episode: 4, airingAt: NOW - 600 },
      { episode: 5, airingAt: NOW + 3600 },
      { episode: 6, airingAt: NOW + 7200 },
    ]);
    expect(lastBody().variables).toMatchObject({ to: NOW, from: NOW - 48 * 3600 });
  });
});

describe('rate limit (HTTP 429)', () => {
  const tooMany = (retryAfter?: string) =>
    new Response('Too Many Requests', {
      status: 429,
      headers: retryAfter === undefined ? {} : { 'Retry-After': retryAfter },
    });

  it('respeita Retry-After e tenta de novo até ter sucesso', async () => {
    fetchMock
      .mockResolvedValueOnce(tooMany('7'))
      .mockResolvedValueOnce(json({ data: { Media: rawMedia(1) } }));

    expect(await client.getAnimeById(1)).toMatchObject({ id: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(7000);
  });

  it('aplica backoff exponencial sem Retry-After e falha com AniListRateLimitError após 3 tentativas', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(tooMany()));

    const error = await client.getAnimeById(1).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AniListRateLimitError);
    expect(error).toMatchObject({ code: 'ANILIST_RATE_LIMIT', retryAfterSeconds: 4 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000]);
  });

  it('usa o maior entre Retry-After e o backoff e propaga o valor no erro', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(tooMany('30')));

    await expect(client.searchAnime('x')).rejects.toMatchObject({ retryAfterSeconds: 30 });
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([30000, 30000]);
  });
});

describe('payload inválido', () => {
  it('lança AniListApiError quando a resposta não bate com o schema Zod', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { Page: { media: [{ id: 'abc' }] } } }));
    const error = await client.searchAnime('x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AniListApiError);
    expect(error).toMatchObject({ code: 'ANILIST_API_ERROR' });
  });

  it('lança AniListApiError quando o corpo não é JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200 }));
    await expect(client.searchAnime('x')).rejects.toBeInstanceOf(AniListApiError);
  });

  it('lança AniListApiError em falha de rede', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(client.searchAnime('x')).rejects.toBeInstanceOf(AniListApiError);
  });
});
