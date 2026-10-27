import type { Anime, ListEntry } from '@animebot/db';

export type ListEntryWithAnime = ListEntry & { anime: Anime };
