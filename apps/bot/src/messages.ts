import {
  AniListApiError,
  AniListRateLimitError,
  AnimeAlreadyInListError,
  AnimeNotFoundError,
  CoreError,
  EntryNotFoundError,
  UnauthorizedEntryAccessError,
} from '@animebot/core';

/** Opções comuns de envio: HTML sempre, sem pré-visualização de links. */
export const HTML_OPTIONS = {
  parse_mode: 'HTML',
  link_preview_options: { is_disabled: true },
} as const;

export const PENDING_APPROVAL_TEXT = 'Seu acesso está aguardando aprovação.';
export const NOT_OWNER_TEXT = 'Esta lista não é sua.';
export const GENERIC_ERROR_TEXT = 'Algo deu errado. Tente novamente em instantes.';

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Texto simples (sem HTML) em PT-BR para um erro de domínio; null se não for tratado. */
export function errorMessage(error: unknown): string | null {
  if (error instanceof AniListRateLimitError) {
    return `A AniList está limitando as requisições. Tente de novo em ${error.retryAfterSeconds}s.`;
  }
  if (error instanceof AniListApiError) {
    return 'Não consegui falar com a AniList agora. Tente novamente em instantes.';
  }
  if (error instanceof AnimeNotFoundError) return 'Anime não encontrado na AniList.';
  if (error instanceof AnimeAlreadyInListError) return 'Já está na sua lista.';
  if (error instanceof EntryNotFoundError) return 'Não encontrei esse anime na sua lista.';
  if (error instanceof UnauthorizedEntryAccessError) return NOT_OWNER_TEXT;
  if (error instanceof CoreError) return error.message;
  return null;
}

/** Junta linhas em mensagens de até `max` caracteres (limite do Telegram: 4096). */
export function chunkLines(lines: string[], max = 3800): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    if (current !== '' && current.length + line.length + 1 > max) {
      chunks.push(current);
      current = '';
    }
    current = current === '' ? line : `${current}\n${line}`;
  }
  if (current !== '') chunks.push(current);
  return chunks;
}
