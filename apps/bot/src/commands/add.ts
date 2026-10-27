import { addAnimeByAnilistId, parseAddArgument } from '@animebot/core';
import type { Bot } from 'grammy';
import { addAndReply, handleAnimeInput } from '../add-flow.js';
import type { BotContext } from '../context.js';

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
}
