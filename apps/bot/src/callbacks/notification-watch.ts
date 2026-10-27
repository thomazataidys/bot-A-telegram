import { markEpisodeWatched } from '@animebot/core';
import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';

/** Botão "✅ Vi" das notificações: define o progresso de quem clicou (se tiver o anime). */
export function registerNotificationWatch(bot: Bot<BotContext>): void {
  bot.callbackQuery(/^watched:([^:]+):(\d{1,6})$/, async (ctx) => {
    const { entry } = await markEpisodeWatched(
      ctx.user.id,
      ctx.match[1] as string,
      Number(ctx.match[2]),
    );
    await ctx.answerCallbackQuery({ text: `Marcado: episódio ${entry.progress} ✅` });
  });
}
