import { AnimeAlreadyInListError, addAnimeByAnilistId } from '@animebot/core';
import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';
import { entryKeyboard, formatEntry } from '../keyboards/entry.js';
import { HTML_OPTIONS } from '../messages.js';
import { replyWithSearchResults } from './search.js';

export function registerAdd(bot: Bot<BotContext>): void {
  // Por enquanto só nome; links (AniList, MAL, Crunchyroll) entram na Fase 6.
  bot.command('add', async (ctx) => {
    const arg = ctx.match.trim();
    if (arg === '') {
      await ctx.reply('Use /add <nome do anime>. Exemplo: /add solo leveling');
      return;
    }
    if (/^https?:\/\//i.test(arg)) {
      await ctx.reply('Ainda não consigo adicionar por link. Envie o nome do anime: /add <nome>.');
      return;
    }
    await replyWithSearchResults(ctx, arg, 3);
  });

  bot.callbackQuery(/^add:(\d+)$/, async (ctx) => {
    const anilistId = Number(ctx.match[1]);
    try {
      const entry = await addAnimeByAnilistId(anilistId, { userId: ctx.user.id });
      await ctx.answerCallbackQuery({ text: 'Adicionado à sua lista!' });
      await ctx.reply(`✅ Adicionado à sua lista:\n\n${formatEntry(entry)}`, {
        ...HTML_OPTIONS,
        reply_markup: entryKeyboard(entry),
      });
    } catch (error) {
      if (!(error instanceof AnimeAlreadyInListError)) throw error;
      await ctx.answerCallbackQuery({ text: 'Já está na sua lista.' });
      await ctx.reply(`Já está na sua lista:\n\n${formatEntry(error.entry)}`, {
        ...HTML_OPTIONS,
        reply_markup: entryKeyboard(error.entry),
      });
    }
  });
}
