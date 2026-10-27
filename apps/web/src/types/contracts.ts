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
  DashboardStats as CoreDashboardStats,
  GetScheduleParams,
  GlobalAnimeItem as CoreGlobalAnimeItem,
  GlobalAnimeWatcher as CoreGlobalAnimeWatcher,
  GlobalListFilter,
  GroupedUserList as CoreGroupedUserList,
  ListEntryWithAnime as CoreListEntryWithAnime,
  PartialAppSettingsInput,
  ProgressUpdateResult,
  RuntimeStatus as CoreRuntimeStatus,
  ScheduleDayGroup as CoreScheduleDayGroup,
  ScheduleItem as CoreScheduleItem,
  ScheduleResult as CoreScheduleResult,
  SyncResult as CoreSyncResult,
  UpdateUserInput,
  UpsertTelegramUserInput,
  UpsertTelegramUserResult,
  UserRegistrationState,
  UserWithStats as CoreUserWithStats,
  WeekRange as CoreWeekRange,
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
  CoreDashboardStats,
  GetScheduleParams,
  CoreGlobalAnimeItem,
  CoreGlobalAnimeWatcher,
  GlobalListFilter,
  CoreGroupedUserList,
  CoreListEntryWithAnime,
  PartialAppSettingsInput,
  ProgressUpdateResult,
  CoreRuntimeStatus,
  CoreScheduleDayGroup,
  CoreScheduleItem,
  CoreScheduleResult,
  CoreSyncResult,
  UpdateUserInput,
  UpsertTelegramUserInput,
  UpsertTelegramUserResult,
  UserRegistrationState,
  CoreUserWithStats,
  CoreWeekRange,
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

export interface WeekRange extends Omit<CoreWeekRange, 'startUtc' | 'endUtc'> {
  startUtc: CoreWeekRange['startUtc'] | string;
  endUtc: CoreWeekRange['endUtc'] | string;
}

export interface ScheduleItem
  extends Omit<
    CoreScheduleItem,
    | 'airingEpisode'
    | 'anime'
    | 'japanAiringAt'
    | 'subbedAiringAt'
    | 'watchers'
  > {
  airingEpisode: AiringEpisode;
  anime: Anime;
  japanAiringAt: CoreScheduleItem['japanAiringAt'] | string;
  subbedAiringAt: CoreScheduleItem['subbedAiringAt'] | string;
  watchers: GlobalAnimeWatcher[];
}

export interface ScheduleDayGroup
  extends Omit<CoreScheduleDayGroup, 'items'> {
  items: ScheduleItem[];
}

export interface ScheduleResult
  extends Omit<CoreScheduleResult, 'weekRange' | 'days' | 'items'> {
  weekRange: WeekRange;
  days: ScheduleDayGroup[];
  items: ScheduleItem[];
}

export interface SyncResult
  extends Omit<CoreSyncResult, 'startedAt' | 'finishedAt'> {
  startedAt: CoreSyncResult['startedAt'] | string;
  finishedAt: CoreSyncResult['finishedAt'] | string;
}

export interface RuntimeStatus
  extends Omit<CoreRuntimeStatus, 'lastSyncAt' | 'lastNotificationAt'> {
  lastSyncAt: CoreRuntimeStatus['lastSyncAt'] | string;
  lastNotificationAt: CoreRuntimeStatus['lastNotificationAt'] | string;
}

export interface DashboardStats
  extends Omit<
    CoreDashboardStats,
    'upcomingEpisodes48h' | 'lastSyncAt' | 'lastNotificationAt'
  > {
  upcomingEpisodes48h: ScheduleItem[];
  lastSyncAt: CoreDashboardStats['lastSyncAt'] | string;
  lastNotificationAt: CoreDashboardStats['lastNotificationAt'] | string;
}

export function getAnimeDisplayTitle(
  anime: Pick<Anime, 'titleEnglish' | 'titleRomaji'>,
): string {
  const english = anime.titleEnglish?.trim();
  return english && english.length > 0 ? english : anime.titleRomaji;
}

export function formatRelativeTimeBR(
  value: Date | string | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) {
    return 'Nunca';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return 'Nunca';
  }

  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSeconds < 60) {
    return 'Agora mesmo';
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `Há ${diffMinutes} min`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `Há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
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
