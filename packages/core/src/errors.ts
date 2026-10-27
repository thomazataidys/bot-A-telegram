import type { ListEntryWithAnime } from './services/list.js';

export type ErrorCode =
  | 'USER_NOT_FOUND'
  | 'USER_INACTIVE'
  | 'DUPLICATE_USERNAME'
  | 'ANIME_NOT_FOUND'
  | 'ANIME_ALREADY_IN_LIST'
  | 'ENTRY_NOT_FOUND'
  | 'AMBIGUOUS_ENTRY_MATCH'
  | 'UNAUTHORIZED_ENTRY_ACCESS'
  | 'INVALID_EPISODE_NUMBER'
  | 'ANILIST_RATE_LIMIT'
  | 'ANILIST_API_ERROR'
  | 'GROUP_CHAT_NOT_CONFIGURED'
  | 'SYNC_ALREADY_RUNNING';

export class CoreError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}

export class UserNotFoundError extends CoreError {
  constructor(identifier: string) {
    super('USER_NOT_FOUND', `Usuário não encontrado: ${identifier}`);
  }
}

export class UserInactiveError extends CoreError {
  readonly userId: string;

  constructor(userId: string) {
    super('USER_INACTIVE', `Usuário inativo: ${userId}`);
    this.userId = userId;
  }
}

export class DuplicateUsernameError extends CoreError {
  readonly username: string;

  constructor(username: string) {
    super('DUPLICATE_USERNAME', `Já existe um usuário com o username @${username}`);
    this.username = username;
  }
}

export class AnimeNotFoundError extends CoreError {
  constructor(identifier: string | number) {
    super('ANIME_NOT_FOUND', `Anime não encontrado: ${identifier}`);
  }
}

export class AnimeAlreadyInListError extends CoreError {
  readonly entry: ListEntryWithAnime;

  constructor(entry: ListEntryWithAnime) {
    super('ANIME_ALREADY_IN_LIST', `O anime já está na lista: ${entry.anime.titleRomaji}`);
    this.entry = entry;
  }
}

export class EntryNotFoundError extends CoreError {
  constructor(identifier: string) {
    super('ENTRY_NOT_FOUND', `Entrada da lista não encontrada: ${identifier}`);
  }
}

export class AmbiguousEntryMatchError extends CoreError {
  readonly candidates: ListEntryWithAnime[];

  constructor(query: string, candidates: ListEntryWithAnime[]) {
    super('AMBIGUOUS_ENTRY_MATCH', `Mais de uma entrada corresponde a "${query}"`);
    this.candidates = candidates;
  }
}

export class UnauthorizedEntryAccessError extends CoreError {
  readonly entryId: string;
  readonly actorUserId: string;

  constructor(entryId: string, actorUserId: string) {
    super(
      'UNAUTHORIZED_ENTRY_ACCESS',
      `Usuário ${actorUserId} não pode acessar a entrada ${entryId}`,
    );
    this.entryId = entryId;
    this.actorUserId = actorUserId;
  }
}

export class InvalidEpisodeNumberError extends CoreError {
  readonly episode: number;
  readonly totalEpisodes: number | null;

  constructor(episode: number, totalEpisodes: number | null = null) {
    super(
      'INVALID_EPISODE_NUMBER',
      totalEpisodes === null
        ? `Número de episódio inválido: ${episode}`
        : `Número de episódio inválido: ${episode} (o anime tem ${totalEpisodes} episódios)`,
    );
    this.episode = episode;
    this.totalEpisodes = totalEpisodes;
  }
}

export class AniListRateLimitError extends CoreError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(
      'ANILIST_RATE_LIMIT',
      `Limite de requisições da AniList atingido; tente novamente em ${retryAfterSeconds}s`,
    );
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class AniListApiError extends CoreError {
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number, options?: ErrorOptions) {
    super('ANILIST_API_ERROR', message, options);
    if (statusCode !== undefined) this.statusCode = statusCode;
  }
}

export class GroupChatNotConfiguredError extends CoreError {
  constructor() {
    super('GROUP_CHAT_NOT_CONFIGURED', 'O grupo de notificações ainda não foi configurado');
  }
}

export class SyncAlreadyRunningError extends CoreError {
  constructor() {
    super('SYNC_ALREADY_RUNNING', 'Já existe uma sincronização em andamento');
  }
}
