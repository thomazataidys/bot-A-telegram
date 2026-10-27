import type * as coreModule from '@animebot/core';
import { InvalidEpisodeNumberError, parseMessageInput } from '@animebot/core';
import type { AniListMedia, ListEntryWithAnime } from '@animebot/core';
import type { Bot } from 'grammy';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const core = vi.hoisted(() => ({
  searchAnimeForSeason: vi.fn(),
  addAnimeByAnilistId: vi.fn(),
  setProgress: vi.fn(),
  getEntryById: vi.fn(),
}));
vi.mock('@animebot/core', async (importOriginal) => ({
  ...(await importOriginal<typeof coreModule>()),
  ...core,
}));

import { handleAnimeInput } from '../add-flow.js';
import { registerAdd } from '../commands/add.js';
import { HELP_TEXT } from '../commands/help.js';
import type { BotContext } from '../context.js';
import { addResultKeyboard, saveProgressKeyboard } from '../keyboards/entry.js';
import { NOT_OWNER_TEXT } from '../messages.js';

const SHARE =
  'Check Out Solo Leveling S2 E5: Isso não é nada demais on Crunchyroll! https://www.crunchyroll.com/watch/GG1U2Q5V2/its-not-a-big-deal?utm_medium=android&utm_source=share';

const media = (id: number): AniListMedia => ({
  id,
  idMal: null,
  title: { romaji: 'Ore dake Level Up na Ken', english: 'Solo Leveling Season 2' },
  bannerImage: null,
  coverImage: { extraLarge: null, large: null, color: null },
  siteUrl: `https://anilist.co/anime/${id}`,
  format: 'TV',
  status: 'FINISHED',
  episodes: 13,
  nextAiringEpisode: null,
});

const entry = (progress: number, userId = 'u1') =>
  ({
    id: 'c'.repeat(25),
    userId,
    status: 'ASSISTINDO',
    progress,
    anime: {
      titleEnglish: 'Solo Leveling',
      titleRomaji: 'x',
      siteUrl: 'https://a.co/1',
      totalEpisodes: 13,
    },
  }) as unknown as ListEntryWithAnime;

type Handler = (ctx: unknown) => Promise<void>;

function handlers(): Map<string, Handler> {
  const map = new Map<string, Handler>();
  registerAdd({
    command: vi.fn(),
    callbackQuery: (pattern: RegExp, handler: Handler) => map.set(pattern.source, handler),
  } as unknown as Bot<BotContext>);
  return map;
}

function fakeCtx(extra: Record<string, unknown> = {}) {
  return {
    user: { id: 'u1' },
    reply: vi.fn().mockResolvedValue(undefined),
    answerCallbackQuery: vi.fn(),
    editMessageText: vi.fn(),
    editMessageReplyMarkup: vi.fn(),
    ...extra,
  };
}

const callbackData = (kb: { inline_keyboard: { callback_data?: string }[][] }) =>
  kb.inline_keyboard.flat().map((b) => b.callback_data ?? '');

beforeEach(() => vi.resetAllMocks());

describe('compartilhamento de episódio — busca', () => {
  it('busca pelo título com a temporada e mostra botões que carregam o episódio', async () => {
    core.searchAnimeForSeason.mockResolvedValue([media(10), media(11)]);
    const ctx = fakeCtx();
    const input = parseMessageInput(SHARE);
    if (!input) throw new Error('não reconheceu');

    await handleAnimeInput(ctx as unknown as BotContext, input);

    expect(core.searchAnimeForSeason).toHaveBeenCalledWith('Solo Leveling', 2, 3);
    // Introdução + um card por opção, cada um com o seu botão que carrega o episódio.
    expect(ctx.reply).toHaveBeenCalledTimes(3);
    expect(ctx.reply.mock.calls[0]?.[0]).toContain('T2 ep 5');
    const cards = ctx.reply.mock.calls.slice(1) as [string, { reply_markup: never }][];
    expect(cards.map(([, options]) => callbackData(options.reply_markup))).toEqual([
      ['adde:10:5'],
      ['adde:11:5'],
    ]);
    expect(cards[0]?.[0]).toContain('1. <b>');
  });

  it('sem resultados responde "Nenhum anime encontrado"', async () => {
    core.searchAnimeForSeason.mockResolvedValue([]);
    const ctx = fakeCtx();
    await handleAnimeInput(ctx as unknown as BotContext, {
      type: 'search_query',
      searchQuery: 'xyzxyz',
    });
    expect(ctx.reply.mock.calls[0]?.[0]).toContain('Nenhum anime encontrado');
  });
});

describe('callbacks adde: / pgs: / pgn:', () => {
  it('adde: adiciona e oferece salvar o progresso', async () => {
    core.addAnimeByAnilistId.mockResolvedValue(entry(0));
    const ctx = fakeCtx({ match: ['adde:10:5', '10', '5'] });

    await handlers().get('^adde:(\\d+):(\\d+)$')?.(ctx);

    expect(core.addAnimeByAnilistId).toHaveBeenCalledWith(10, { userId: 'u1' });
    expect(ctx.reply).toHaveBeenCalledTimes(2);
    const [text, options] = ctx.reply.mock.calls[1] as [string, { reply_markup: never }];
    expect(text).toContain('episódio 5');
    expect(callbackData(options.reply_markup)).toEqual([
      `pgs:${'c'.repeat(25)}:5`,
      `pgn:${'c'.repeat(25)}`,
    ]);
  });

  it('não sugere se o progresso já é o episódio do link', async () => {
    core.addAnimeByAnilistId.mockResolvedValue(entry(5));
    const ctx = fakeCtx({ match: ['adde:10:5', '10', '5'] });
    await handlers().get('^adde:(\\d+):(\\d+)$')?.(ctx);
    expect(ctx.reply).toHaveBeenCalledTimes(1);
  });

  it('pgs: salva o progresso de quem clicou', async () => {
    core.setProgress.mockResolvedValue({ entry: entry(5), reachedTotalEpisodes: false });
    const ctx = fakeCtx({ match: ['x', 'e1', '5'] });

    await handlers().get('^pgs:([^:]+):(\\d+)$')?.(ctx);

    expect(core.setProgress).toHaveBeenCalledWith('e1', 5, 'u1');
    expect(ctx.editMessageText.mock.calls[0]?.[0]).toContain('Progresso salvo: episódio 5');
  });

  it('pgs: avisa quando o episódio passa do total', async () => {
    core.setProgress.mockRejectedValue(new InvalidEpisodeNumberError(20, 13));
    const ctx = fakeCtx({ match: ['x', 'e1', '20'] });
    await handlers().get('^pgs:([^:]+):(\\d+)$')?.(ctx);
    expect(ctx.answerCallbackQuery.mock.calls[0]?.[0].text).toContain('13');
    expect(ctx.editMessageText).not.toHaveBeenCalled();
  });

  it('pgn: só o dono dispensa a sugestão', async () => {
    core.getEntryById.mockResolvedValue(entry(0, 'dono'));
    const intruder = fakeCtx({ match: ['x', 'e1'] });
    await handlers().get('^pgn:(.+)$')?.(intruder);
    expect(intruder.answerCallbackQuery).toHaveBeenCalledWith({
      text: NOT_OWNER_TEXT,
      show_alert: true,
    });
    expect(intruder.editMessageText).not.toHaveBeenCalled();

    const owner = fakeCtx({ user: { id: 'dono' }, match: ['x', 'e1'] });
    await handlers().get('^pgn:(.+)$')?.(owner);
    expect(owner.editMessageText).toHaveBeenCalled();
  });
});

describe('callback_data e ajuda', () => {
  it('cabe em 64 bytes mesmo com id longo e episódio grande', () => {
    const kbs = [
      addResultKeyboard(media(999999999), 9999),
      saveProgressKeyboard('c'.repeat(25), 9999),
    ];
    for (const kb of kbs) {
      for (const data of callbackData(kb as never)) {
        expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64);
      }
    }
  });

  it('/ajuda menciona o compartilhamento de episódio', () => {
    expect(HELP_TEXT).toContain('compartilhamento de um episódio da Crunchyroll');
  });
});
