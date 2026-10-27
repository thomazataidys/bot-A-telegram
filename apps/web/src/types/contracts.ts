import { z } from 'zod';
import type {
  AiringEpisode as DbAiringEpisode,
  Anime as DbAnime,
  ListEntry as DbListEntry,
  ListStatus,
  Setting,
  SettingKey,
  User as DbUser,
} from '@animebot/db';
import type {
  AddAnimeOptions,
  AniListAiringMedia,
  AniListAiringNode,
  AniListFormat,
  AniListMedia,
  AniListStatus,
  AppSettings,
  CreatePanelUserInput,
  GlobalAnimeItem as CoreGlobalAnimeItem,
  GlobalAnimeWatcher as CoreGlobalAnimeWatcher,
  GlobalListFilter,
  GroupedUserList as CoreGroupedUserList,
  ListEntryWithAnime as CoreListEntryWithAnime,
  PartialAppSettingsInput,
  ProgressUpdateResult,
  UpdateUserInput,
  UpsertTelegramUserInput,
  UpsertTelegramUserResult,
  UserRegistrationState,
  UserWithStats as CoreUserWithStats,
} from '@animebot/core';

export type {
  ListStatus,
  Setting,
  SettingKey,
  DbUser,
  DbAnime,
  DbListEntry,
  DbAiringEpisode,
  AddAnimeOptions,
  AniListAiringMedia,
  AniListAiringNode,
  AniListFormat,
  AniListMedia,
  AniListStatus,
  AppSettings,
  CreatePanelUserInput,
  CoreGlobalAnimeItem,
  CoreGlobalAnimeWatcher,
  GlobalListFilter,
  CoreGroupedUserList,
  CoreListEntryWithAnime,
  PartialAppSettingsInput,
  ProgressUpdateResult,
  UpdateUserInput,
  UpsertTelegramUserInput,
  UpsertTelegramUserResult,
  UserRegistrationState,
  CoreUserWithStats,
};

/**
 * Versões serializáveis para componentes client (suportam tanto Date/bigint do core
 * quanto string após serialização RSC -> Client Component).
 */
export interface User
  extends Omit<DbUser, 'telegramId' | 'createdAt' | 'updatedAt'> {
  telegramId: DbUser['telegramId'] | string;
  createdAt: DbUser['createdAt'] | string;
  updatedAt: DbUser['updatedAt'] | string;
}

export interface Anime extends Omit<DbAnime, 'lastSyncedAt'> {
  lastSyncedAt: DbAnime['lastSyncedAt'] | string;
}

export interface ListEntry extends Omit<DbListEntry, 'addedAt' | 'updatedAt'> {
  addedAt: DbListEntry['addedAt'] | string;
  updatedAt: DbListEntry['updatedAt'] | string;
}

export interface AiringEpisode
  extends Omit<DbAiringEpisode, 'airingAt' | 'notifiedAt'> {
  airingAt: DbAiringEpisode['airingAt'] | string;
  notifiedAt: DbAiringEpisode['notifiedAt'] | string;
}

export interface UserWithStats
  extends Omit<CoreUserWithStats, 'telegramId' | 'createdAt' | 'updatedAt'> {
  telegramId: CoreUserWithStats['telegramId'] | string;
  createdAt: CoreUserWithStats['createdAt'] | string;
  updatedAt: CoreUserWithStats['updatedAt'] | string;
}

export interface ListEntryWithAnime extends ListEntry {
  anime: Anime & {
    nextEpisode: AiringEpisode | null;
  };
}

export interface GroupedUserList {
  user: User;
  ASSISTINDO: ListEntryWithAnime[];
  QUERO_VER: ListEntryWithAnime[];
  COMPLETO: ListEntryWithAnime[];
  totalCount: number;
}

export interface GlobalAnimeWatcher
  extends Omit<CoreGlobalAnimeWatcher, 'user'> {
  user: Pick<User, 'id' | 'name' | 'username' | 'telegramId' | 'active'>;
}

export interface GlobalAnimeItem {
  anime: Anime;
  displayTitle: string;
  nextEpisode: AiringEpisode | null;
  watchers: GlobalAnimeWatcher[];
}

/**
 * Tipos dos serviços schedule e sync completo (ainda em implementação no core).
 */
export interface WeekRange {
  offsetWeeks: number;
  timezone: string;
  startUtc: Date | string;
  endUtc: Date | string;
  periodLabel: string;
}

export interface ScheduleItem {
  airingEpisode: AiringEpisode;
  anime: Anime;
  displayTitle: string;
  episode: number;
  japanAiringAt: Date | string;
  subbedAiringAt: Date | string;
  formattedTime: string;
  formattedDayHeader: string;
  dayKey: string;
  watchers: GlobalAnimeWatcher[];
}

export interface ScheduleDayGroup {
  dayKey: string;
  dayHeader: string;
  items: ScheduleItem[];
}

export interface ScheduleResult {
  weekRange: WeekRange;
  delayMinutes: number;
  timezone: string;
  days: ScheduleDayGroup[];
  items: ScheduleItem[];
}

export interface GetScheduleParams {
  userId?: string;
  offsetWeeks?: number;
  now?: Date;
}

export interface SyncResult {
  syncedAnimesCount: number;
  upsertedEpisodesCount: number;
  startedAt: Date | string;
  finishedAt: Date | string;
}

export interface DashboardStats {
  activeUsersCount: number;
  totalUsersCount: number;
  trackedAnimesCount: number;
  upcomingEpisodes48h: ScheduleItem[];
  lastSyncAt: Date | string | null;
  lastNotificationAt: Date | string | null;
}

export function getAnimeDisplayTitle(
  anime: Pick<Anime, 'titleEnglish' | 'titleRomaji'>,
): string {
  const english = anime.titleEnglish?.trim();
  return english && english.length > 0 ? english : anime.titleRomaji;
}

export const settingsFormSchema = z.object({
  groupChatId: z
    .string()
    .trim()
    .refine(
      (val) => val === '' || /^-?\d+$/.test(val),
      'O ID do grupo deve conter apenas números (ex.: -1001234567890) ou ficar em branco.',
    ),
  notificationDelayMinutes: z.coerce
    .number()
    .int('Informe um número inteiro de minutos.')
    .min(0, 'O atraso não pode ser negativo.')
    .max(1440, 'O atraso máximo é de 1440 minutos (24 horas).'),
  syncIntervalMinutes: z.coerce
    .number()
    .int('Informe um número inteiro de minutos.')
    .min(5, 'O intervalo mínimo de sincronização é de 5 minutos.')
    .max(720, 'O intervalo máximo é de 720 minutos (12 horas).'),
  timezone: z
    .string()
    .trim()
    .min(3, 'Informe um fuso horário válido (ex.: America/Fortaleza).'),
  autoApproveUsers: z.boolean(),
});
