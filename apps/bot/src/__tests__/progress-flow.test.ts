import type { GlobalAnimeItem, ListEntryWithAnime } from '@animebot/core';
import type { InlineKeyboard } from 'grammy';
import { describe, expect, it } from 'vitest';
import { formatGlobalItem } from '../commands/global.js';
import { parseViArgs } from '../commands/vi.js';
import {
  entryCard,
  entryKeyboard,
  openEntryKeyboard,
  pickEpisodeEntryKeyboard,
} from '../keyboards/entry.js';
import { chunkLines } from '../messages.js';
import { PENDING_TTL_MS, PendingEpisodes, pendingKey } from '../pending.js';

const id = 'c'.repeat(25);
const entry = {
  id,
  status: 'ASSISTINDO',
  progress: 12,
  anime: {
    titleEnglish: 'Solo Leveling',
    titleRomaji: 'Ore dake Level Up na Ken',
    siteUrl: 'https://anilist.co/anime/1',
    totalEpisodes: 12,
  },
} as unknown as ListEntryWithAnime;

function callbackData(keyboard: InlineKeyboard): string[] {
  return keyboard.inline_keyboard
    .flat()
    .map((button) => ('callback_data' in button ? button.callback_data : ''));
}

describe('parseViArgs', () => {
  it('separa o nome do último token numérico', () => {
    expect(parseViArgs('solo leveling 5')).toEqual({ query: 'solo leveling', episode: 5 });
    expect(parseViArgs('  86  12 ')).toEqual({ query: '86', episode: 12 });
  });

  it('rejeita entradas sem nome ou sem episódio inteiro', () => {
    expect(parseViArgs('')).toBeNull();
    expect(parseViArgs('5')).toBeNull();
    expect(parseViArgs('solo leveling')).toBeNull();
    expect(parseViArgs('solo leveling -1')).toBeNull();
    expect(parseViArgs('solo leveling 1.5')).toBeNull();
  });
});

describe('teclado da entrada', () => {
  it('tem todas as ações e callback_data com até 64 bytes', () => {
    const data = callbackData(entryKeyboard(entry, { offerComplete: true }));
    expect(data).toEqual([
      `inc:${id}`,
      `setep:${id}`,
      `st:${id}:A`,
      `st:${id}:Q`,
      `st:${id}:C`,
      `rm:${id}`,
      `st:${id}:C`,
    ]);
    const all = [
      ...data,
      ...callbackData(openEntryKeyboard([entry])),
      ...callbackData(pickEpisodeEntryKeyboard([entry], 999999)),
    ];
    for (const item of all) expect(Buffer.byteLength(item)).toBeLessThanOrEqual(64);
  });

  it('só pergunta "completo" quando pedido', () => {
    expect(callbackData(entryKeyboard(entry))).toHaveLength(6);
    expect(entryCard(entry).text).not.toContain('Marcar como completo');
    expect(entryCard(entry, { offerComplete: true }).text).toContain('Marcar como completo?');
  });
});

describe('formatGlobalItem', () => {
  it('lista quem acompanha com progresso e escapa nomes', () => {
    const item = {
      displayTitle: 'Solo <Leveling>',
      anime: { siteUrl: 'https://anilist.co/anime/1' },
      watchers: [
        { user: { name: 'Thomaz' }, status: 'ASSISTINDO', progress: 5 },
        { user: { name: 'Luiz & Cia' }, status: 'QUERO_VER', progress: 0 },
        { user: { name: 'Ana' }, status: 'COMPLETO', progress: 12 },
      ],
    } as unknown as GlobalAnimeItem;
    const text = formatGlobalItem(item);
    expect(text).toContain('Solo &lt;Leveling&gt;');
    expect(text).toContain('Thomaz (ep 5), Luiz &amp; Cia (ep 0 🕒), Ana (ep 12 ✅)');
  });
});

describe('chunkLines', () => {
  it('quebra em mensagens menores que o limite sem perder linhas', () => {
    const lines = Array.from({ length: 10 }, (_, i) => `linha ${i}`.padEnd(20, 'x'));
    const chunks = chunkLines(lines, 50);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(50);
    expect(chunks.join('\n').split('\n')).toEqual(lines);
    expect(chunkLines([])).toEqual([]);
  });
});

describe('PendingEpisodes', () => {
  it('guarda por chat e usuário e expira depois do TTL', () => {
    const pending = new PendingEpisodes();
    const key = pendingKey(-100, 42);
    pending.set(key, 'e1', 7, 1000);

    expect(pending.get(key, 1000 + PENDING_TTL_MS - 1)?.entryId).toBe('e1');
    expect(pending.get(pendingKey(-100, 43), 1000)).toBeUndefined();
    expect(pending.get(key, 1000 + PENDING_TTL_MS)).toBeUndefined();
  });

  it('delete remove o estado', () => {
    const pending = new PendingEpisodes();
    pending.set('k', 'e1', 1);
    pending.delete('k');
    expect(pending.get('k')).toBeUndefined();
  });
});
