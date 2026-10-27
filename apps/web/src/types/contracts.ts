import { z } from 'zod';

/**
 * Tipos locais espelhando os contratos de @animebot/db e @animebot/core (docs/CONTRATOS.md).
 * Na etapa de integração com o backend, podem ser re-exportados diretamente de @animebot/core e @animebot/db.
 */

export type ListStatus = 'ASSISTINDO' | 'QUERO_VER' | 'COMPLETO';

export type SettingKey =
  | 'groupChatId'
  | 'notificationDelayMinutes'
  | 'syncIntervalMinutes'
  | 'timezone'
  | 'autoApproveUsers';

export interface User {
  id: string;
  telegramId: bigint | string | null;
  username: string | null;
  name: string;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Anime {
  id: string;
  anilistId: number;
  malId: number | null;
  titleEnglish: string | null;
  titleRomaji: string;
  coverUrl: string | null;
  siteUrl: string;
  format: string | null;
  status: string | null;
  totalEpisodes: number | null;
  lastSyncedAt: Date | string | null;
}

export interface ListEntry {
  id: string;
  userId: string;
  animeId: string;
  status: ListStatus;
  progress: number;
  addedAt: Date | string;
  updatedAt: Date | string;
}

export interface AiringEpisode {
  id: string;
  animeId: string;
  episode: number;
  airingAt: Date | string;
  notifiedAt: Date | string | null;
}

export interface Setting {
  key: string;
  value: string;
}

export type AniListFormat =
  | 'TV'
  | 'TV_SHORT'
  | 'MOVIE'
  | 'SPECIAL'
  | 'OVA'
  | 'ONA'
  | 'MUSIC'
  | string;

export type AniListStatus =
  | 'FINISHED'
  | 'RELEASING'
  | 'NOT_YET_RELEASED'
  | 'CANCELLED'
  | 'HIATUS'
  | string;

export interface AniListAiringNode {
  episode: number;
  airingAt: number;
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
    nodes: AniListAiringNode[];
  };
}

export interface AppSettings {
  groupChatId: string | null;
  notificationDelayMinutes: number;
  syncIntervalMinutes: number;
  timezone: string;
  autoApproveUsers: boolean;
}

export type PartialAppSettingsInput = Partial<AppSettings>;

export type UserRegistrationState =
  | 'ACTIVE'
  | 'PENDING_APPROVAL'
  | 'NEVER_STARTED_BOT';

export interface UserWithStats extends User {
  entriesCount: number;
  registrationState: UserRegistrationState;
}

export interface CreatePanelUserInput {
  name: string;
  username?: string | null;
  active?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  username?: string | null;
  active?: boolean;
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

export interface GlobalAnimeWatcher {
  user: Pick<User, 'id' | 'name' | 'username' | 'telegramId' | 'active'>;
  entryId: string;
  status: ListStatus;
  progress: number;
}

export interface GlobalAnimeItem {
  anime: Anime;
  displayTitle: string;
  nextEpisode: AiringEpisode | null;
  watchers: GlobalAnimeWatcher[];
}

export interface GlobalListFilter {
  userId?: string;
  listStatus?: ListStatus;
  animeStatus?: string;
  search?: string;
}

export interface AddAnimeOptions {
  userId: string;
  status?: ListStatus;
  initialProgress?: number;
}

export interface ProgressUpdateResult {
  entry: ListEntryWithAnime;
  reachedTotalEpisodes: boolean;
}

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
