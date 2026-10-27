import { parseMessageInput } from '@animebot/core';
import type { Bot } from 'grammy';
import { handleAnimeInput } from '../add-flow.js';
import type { BotContext } from '../context.js';

/**
 * Detecta link de anime ou "+ nome" em qualquer mensagem de texto (grupo ou privado).
 * Deve ser registrado depois do handler do fluxo "✏️ Definir ep", que consome o número antes.
 */
export function registerMessageLinks(bot: Bot<BotContext>): void {
  bot.on('message:text', async (ctx, next) => {
    const input = parseMessageInput(ctx.message.text);
    if (!input) {
      await next();
      return;
    }
    await handleAnimeInput(ctx, input);
  });
}
