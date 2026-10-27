import {
  InvalidEpisodeNumberError,
  addAnimeByAnilistId,
  getEntryById,
  parseAddArgument,
  setProgress,
} from '@animebot/core';
import type { Bot } from 'grammy';
import { addAndReply, handleAnimeInput } from '../add-flow.js';
import type { BotContext } from '../context.js';
import { NOT_OWNER_TEXT } from '../messages.js';

export function registerAdd(bot: Bot<BotContext>): void {
  bot.command('add', async (ctx) => {
    const arg = ctx.match.trim();
    if (arg === '') {
      await ctx.reply('Use /add <nome ou link do anime>. Exemplo: /add solo leveling');
      return;
    }
    const input = parseAddArgument(arg);
    if (!input) {
      await ctx.reply(
        'Não reconheci esse link. Envie um link da AniList, MyAnimeList ou Crunchyroll, ou o nome do anime.',
      );
      return;
    }
    await handleAnimeInput(ctx, input);
  });

  bot.callbackQuery(/^add:(\d+)$/, async (ctx) => {
    const anilistId = Number(ctx.match[1]);
    const outcome = await addAndReply(ctx, () =>
      addAnimeByAnilistId(anilistId, { userId: ctx.user.id }),
    );
    await ctx.answerCallbackQuery({
      text: outcome === 'added' ? 'Adicionado à sua lista!' : 'Já está na sua lista.',
    });
  });
  // Link de episódio da Crunchyroll: adiciona e oferece salvar o episódio como progresso.
  bot.callbackQuery(/^adde:(\d+):(\d+)$/, async (ctx) => {
    const anilistId = Number(ctx.match[1]);
    const episode = Number(ctx.match[2]);
    const outcome = await addAndReply(
      ctx,
      () => addAnimeByAnilistId(anilistId, { userId: ctx.user.id }),
      episode,
    );
    await ctx.answerCallbackQuery({
      text: outcome === 'added' ? 'Adicionado à sua lista!' : 'Já está na sua lista.',
    });
  });

  bot.callbackQuery(/^pgs:([^:]+):(\d+)$/, async (ctx) => {
    try {
      const { entry } = await setProgress(ctx.match[1] as string, Number(ctx.match[2]), ctx.user.id);
      await ctx.answerCallbackQuery({ text: `Episódio ${entry.progress}` });
      await ctx.editMessageText(`💾 Progresso salvo: episódio ${entry.progress}.`, {
        reply_markup: undefined,
      });
    } catch (error) {
      if (!(error instanceof InvalidEpisodeNumberError)) throw error;
      await ctx.answerCallbackQuery({ text: error.message, show_alert: true });
      await ctx.editMessageReplyMarkup();
    }
  });

  bot.callbackQuery(/^pgn:(.+)$/, async (ctx) => {
    const entry = await getEntryById(ctx.match[1] as string);
    if (entry.userId !== ctx.user.id) {
      await ctx.answerCallbackQuery({ text: NOT_OWNER_TEXT, show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery({ text: 'Ok, progresso mantido.' });
    await ctx.editMessageText('Progresso mantido.', { reply_markup: undefined });
  });
}
