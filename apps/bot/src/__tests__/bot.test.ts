import {
  AniListRateLimitError,
  AnimeNotFoundError,
  UnauthorizedEntryAccessError,
} from '@animebot/core';
import type { ListEntryWithAnime } from '@animebot/core';
import { describe, expect, it } from 'vitest';
import { BOT_COMMANDS } from '../bot.js';
import { formatEntry, pickEntryKeyboard, removeConfirmKeyboard } from '../keyboards/entry.js';
import { errorMessage, truncate } from '../messages.js';

const entry = {
  id: 'e1',
  status: 'ASSISTINDO',
  progress: 3,
  anime: {
    titleEnglish: 'Tom & <Jerry>',
    titleRomaji: 'Tomu to Jerry',
    siteUrl: 'https://anilist.co/anime/1?a=1&b=2',
    totalEpisodes: null,
  },
} as unknown as ListEntryWithAnime;

describe('formatEntry', () => {
  it('escapa título e URL e mostra o progresso com total desconhecido', () => {
    const text = formatEntry(entry);
    expect(text).toContain('Tom &amp; &lt;Jerry&gt;');
    expect(text).toContain('href="https://anilist.co/anime/1?a=1&amp;b=2"');
    expect(text).toContain('ep 3/?');
  });
});

describe('callback_data', () => {
  it('cabe em 64 bytes mesmo com ids longos', () => {
    const id = 'c'.repeat(25);
    const keyboards = [removeConfirmKeyboard(id), pickEntryKeyboard([{ ...entry, id }])];
    for (const keyboard of keyboards) {
      for (const button of keyboard.inline_keyboard.flat()) {
        const data = 'callback_data' in button ? button.callback_data : '';
        expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64);
      }
    }
  });
});

describe('errorMessage', () => {
  it('traduz erros do domínio e ignora erros desconhecidos', () => {
    expect(errorMessage(new AniListRateLimitError(7))).toContain('7s');
    expect(errorMessage(new AnimeNotFoundError(1))).toBe('Anime não encontrado na AniList.');
    expect(errorMessage(new UnauthorizedEntryAccessError('e', 'u'))).toBe('Esta lista não é sua.');
    expect(errorMessage(new Error('boom'))).toBeNull();
  });
});

describe('truncate', () => {
  it('corta com reticências', () => {
    expect(truncate('abcdef', 4)).toBe('abc…');
    expect(truncate('abc', 4)).toBe('abc');
  });
});

describe('BOT_COMMANDS', () => {
  it('tem descrições em PT-BR dentro dos limites do Telegram', () => {
    for (const { command, description } of BOT_COMMANDS) {
      expect(command).toMatch(/^[a-z0-9_]{1,32}$/);
      expect(description.length).toBeLessThanOrEqual(256);
    }
  });
});
