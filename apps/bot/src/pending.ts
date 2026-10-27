/** Estado em memória do fluxo "✏️ Definir ep": aguarda o número na próxima mensagem do usuário. */
export const PENDING_TTL_MS = 2 * 60 * 1000;

export interface PendingEpisode {
  entryId: string;
  promptMessageId: number;
  expiresAt: number;
}

export class PendingEpisodes {
  private readonly pending = new Map<string, PendingEpisode>();

  set(key: string, entryId: string, promptMessageId: number, now = Date.now()): void {
    for (const [otherKey, value] of this.pending) {
      if (value.expiresAt <= now) this.pending.delete(otherKey);
    }
    this.pending.set(key, { entryId, promptMessageId, expiresAt: now + PENDING_TTL_MS });
  }

  get(key: string, now = Date.now()): PendingEpisode | undefined {
    const value = this.pending.get(key);
    if (value && value.expiresAt <= now) {
      this.pending.delete(key);
      return undefined;
    }
    return value;
  }

  delete(key: string): void {
    this.pending.delete(key);
  }
}

export const pendingEpisodes = new PendingEpisodes();

/** Chave por chat + usuário: o mesmo usuário pode estar no privado e em grupos. */
export function pendingKey(chatId: number, telegramUserId: number): string {
  return `${chatId}:${telegramUserId}`;
}
