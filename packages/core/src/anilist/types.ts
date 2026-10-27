export type AniListFormat =
  'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC' | (string & {});

export type AniListStatus =
  'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS' | (string & {});

export interface AniListAiringNode {
  episode: number;
  airingAt: number; // Unix timestamp em segundos (UTC)
}

export interface AniListMedia {
  id: number;
  idMal: number | null;
  title: {
    romaji: string;
    english: string | null;
  };
  coverImage: {
    large: string | null;
  };
  siteUrl: string;
  format: AniListFormat | null;
  status: AniListStatus | null;
  episodes: number | null;
  nextAiringEpisode: AniListAiringNode | null;
}

export interface AniListAiringMedia extends AniListMedia {
  airingSchedule: {
    nodes: AniListAiringNode[]; // inclui próximos episódios (notYetAired) + episódio recente
  };
}
