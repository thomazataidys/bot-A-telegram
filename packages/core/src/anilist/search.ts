import { searchAnime } from './client.js';
import type { AniListMedia } from './types.js';

const MIN_FALLBACK_CHARS = 3;

/** Query original e versões encurtadas: antes da vírgula e antes dos dois-pontos, sem repetir. */
export function queryFallbacks(query: string): string[] {
  const full = query.replace(/\s+/g, ' ').trim();
  const candidates = [full, full.split(',')[0] ?? '', full.split(':')[0] ?? ''];
  const unique: string[] = [];
  for (const candidate of candidates) {
    const text = candidate.trim();
    const useful = text === full || text.length >= MIN_FALLBACK_CHARS;
    if (useful && text !== '' && !unique.includes(text)) unique.push(text);
  }
  return unique;
}

/** Busca na AniList; se não vier nada, tenta de novo com a query encurtada. */
export async function searchAnimeWithFallback(
  query: string,
  limit?: number,
): Promise<AniListMedia[]> {
  for (const candidate of queryFallbacks(query)) {
    const results = await searchAnime(candidate, limit);
    if (results.length > 0) return results;
  }
  return [];
}

const ORDINALS: Record<number, string> = { 2: '2nd', 3: '3rd' };

function ordinal(season: number): string {
  return ORDINALS[season] ?? `${season}th`;
}

/** 2 = título cita exatamente a temporada pedida; 1 = cita "Part N"; 0 = nada. */
export function seasonScore(media: AniListMedia, season: number): number {
  const titles = [media.title.english, media.title.romaji].filter((t): t is string => !!t);
  const exact = new RegExp(
    `(?:\\bseason\\s*${season}\\b|\\b${ordinal(season)}\\s+season\\b|\\bs${season}\\b)`,
    'i',
  );
  if (titles.some((title) => exact.test(title))) return 2;
  return titles.some((title) => /\bpart\s*\d+\b/i.test(title)) ? 1 : 0;
}

/** Ordena (de forma estável) colocando primeiro os resultados que citam a temporada. */
export function prioritizeSeason(results: AniListMedia[], season: number): AniListMedia[] {
  return results
    .map((media, index) => ({ media, index, score: seasonScore(media, season) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ media }) => media);
}

/**
 * Busca por título de um episódio compartilhado. Temporada > 1: busca também
 * "<título> Season N", mescla sem duplicar e prioriza os títulos da temporada.
 */
export async function searchAnimeForSeason(
  title: string,
  season: number | undefined,
  limit = 3,
): Promise<AniListMedia[]> {
  if (season === undefined || season <= 1) return searchAnimeWithFallback(title, limit);

  const [base, seasonal] = await Promise.all([
    searchAnimeWithFallback(title, limit),
    searchAnimeWithFallback(`${title} Season ${season}`, limit),
  ]);
  const merged = new Map<number, AniListMedia>();
  for (const media of [...seasonal, ...base]) if (!merged.has(media.id)) merged.set(media.id, media);
  return prioritizeSeason([...merged.values()], season).slice(0, limit);
}
