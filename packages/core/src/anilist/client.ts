import type { z } from 'zod';
import { AniListApiError, AniListRateLimitError } from '../errors.js';
import {
  ANIME_BY_ID_QUERY,
  ANIME_BY_MAL_ID_QUERY,
  AIRING_SCHEDULES_QUERY,
  SEARCH_ANIME_QUERY,
} from './queries.js';
import {
  airingResponseSchema,
  graphqlEnvelopeSchema,
  searchResponseSchema,
  singleMediaResponseSchema,
} from './schemas.js';
import type { AniListAiringMedia, AniListMedia } from './types.js';

export const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
export const MAX_ATTEMPTS = 3;
export const BATCH_SIZE = 50;
/** Janela (em segundos) de episódios recém-exibidos incluída em getAiringSchedules. */
export const RECENT_WINDOW_SECONDS = 48 * 60 * 60;

const BASE_BACKOFF_SECONDS = 1;

export interface AniListClientOptions {
  endpoint?: string;
  maxAttempts?: number;
  /** Espera entre tentativas; injetável para testes. */
  sleep?: (ms: number) => Promise<void>;
  /** Unix timestamp atual em segundos; injetável para testes. */
  now?: () => number;
}

export interface AniListClient {
  searchAnime(query: string, limit?: number): Promise<AniListMedia[]>;
  getAnimeById(anilistId: number): Promise<AniListMedia | null>;
  getAnimeByMalId(malId: number): Promise<AniListMedia | null>;
  getAiringSchedules(anilistIds: number[]): Promise<AniListAiringMedia[]>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function parseRetryAfter(header: string | null): number | null {
  if (header === null) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

export function createAniListClient(options: AniListClientOptions = {}): AniListClient {
  const endpoint = options.endpoint ?? ANILIST_ENDPOINT;
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? ((): number => Math.floor(Date.now() / 1000));

  async function post(query: string, variables: Record<string, unknown>): Promise<Response> {
    for (let attempt = 1; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ query, variables }),
        });
      } catch (cause) {
        throw new AniListApiError('Falha de rede ao acessar a AniList', undefined, { cause });
      }
      if (response.status !== 429) return response;

      const backoff = BASE_BACKOFF_SECONDS * 2 ** (attempt - 1);
      const retryAfter = Math.max(
        parseRetryAfter(response.headers.get('Retry-After')) ?? 0,
        backoff,
      );
      if (attempt >= maxAttempts) throw new AniListRateLimitError(retryAfter);
      await sleep(retryAfter * 1000);
    }
  }

  /** Executa a query e valida `data` com o schema. Retorna null em 404 se `nullOn404`. */
  async function request<S extends z.ZodType>(
    query: string,
    variables: Record<string, unknown>,
    schema: S,
    nullOn404 = false,
  ): Promise<z.output<S> | null> {
    const response = await post(query, variables);

    let body: unknown;
    try {
      body = await response.json();
    } catch (cause) {
      if (nullOn404 && response.status === 404) return null;
      throw new AniListApiError('Resposta da AniList não é um JSON válido', response.status, {
        cause,
      });
    }

    const envelope = graphqlEnvelopeSchema.safeParse(body);
    const errors = envelope.success ? (envelope.data.errors ?? []) : [];

    if (nullOn404 && (response.status === 404 || errors.some((e) => e.status === 404))) return null;

    if (!response.ok || errors.length > 0) {
      const message = errors.map((e) => e.message).join('; ') || `HTTP ${response.status}`;
      throw new AniListApiError(
        `Erro da AniList: ${message}`,
        errors[0]?.status ?? response.status,
      );
    }

    if (!envelope.success) {
      throw new AniListApiError('Resposta da AniList fora do formato esperado', response.status, {
        cause: envelope.error,
      });
    }

    const parsed = schema.safeParse(envelope.data.data);
    if (!parsed.success) {
      throw new AniListApiError('Resposta da AniList fora do formato esperado', response.status, {
        cause: parsed.error,
      });
    }
    return parsed.data;
  }

  async function searchAnime(query: string, limit = 5): Promise<AniListMedia[]> {
    const data = await request(
      SEARCH_ANIME_QUERY,
      { search: query, perPage: limit },
      searchResponseSchema,
    );
    return data?.Page.media ?? [];
  }

  async function getAnimeById(anilistId: number): Promise<AniListMedia | null> {
    const data = await request(
      ANIME_BY_ID_QUERY,
      { id: anilistId },
      singleMediaResponseSchema,
      true,
    );
    return data?.Media ?? null;
  }

  async function getAnimeByMalId(malId: number): Promise<AniListMedia | null> {
    const data = await request(
      ANIME_BY_MAL_ID_QUERY,
      { idMal: malId },
      singleMediaResponseSchema,
      true,
    );
    return data?.Media ?? null;
  }

  async function getAiringSchedules(anilistIds: number[]): Promise<AniListAiringMedia[]> {
    const ids = [...new Set(anilistIds)];
    const result: AniListAiringMedia[] = [];

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const to = now();
      const data = await request(
        AIRING_SCHEDULES_QUERY,
        { ids: batch, from: to - RECENT_WINDOW_SECONDS, to },
        airingResponseSchema,
      );
      if (!data) continue;

      for (const media of data.media.media) {
        const byEpisode = new Map(media.airingSchedule.nodes.map((n) => [n.episode, n]));
        for (const recent of data.recent.airingSchedules) {
          if (recent.mediaId === media.id && !byEpisode.has(recent.episode)) {
            byEpisode.set(recent.episode, { episode: recent.episode, airingAt: recent.airingAt });
          }
        }
        const nodes = [...byEpisode.values()].sort((a, b) => a.episode - b.episode);
        result.push({ ...media, airingSchedule: { nodes } });
      }
    }
    return result;
  }

  return { searchAnime, getAnimeById, getAnimeByMalId, getAiringSchedules };
}

const defaultClient = createAniListClient();

export const searchAnime = (query: string, limit?: number): Promise<AniListMedia[]> =>
  defaultClient.searchAnime(query, limit);
export const getAnimeById = (anilistId: number): Promise<AniListMedia | null> =>
  defaultClient.getAnimeById(anilistId);
export const getAnimeByMalId = (malId: number): Promise<AniListMedia | null> =>
  defaultClient.getAnimeByMalId(malId);
export const getAiringSchedules = (anilistIds: number[]): Promise<AniListAiringMedia[]> =>
  defaultClient.getAiringSchedules(anilistIds);
