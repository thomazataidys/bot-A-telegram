import type { Anime } from '@animebot/db';

/** titleEnglish quando preenchido; caso contrário, titleRomaji. */
export function displayTitle(anime: Pick<Anime, 'titleEnglish' | 'titleRomaji'>): string {
  const english = anime.titleEnglish?.trim();
  return english ? english : anime.titleRomaji;
}

/** Minúsculas, sem acentos e com espaços colapsados — para comparar títulos e buscas. */
export function normalizeSearchQuery(query: string): string {
  return query
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
