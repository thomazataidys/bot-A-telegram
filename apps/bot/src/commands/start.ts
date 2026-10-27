import { escapeHtml } from '@animebot/core';
import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';
import { HTML_OPTIONS } from '../messages.js';

export function registerStart(bot: Bot<BotContext>): void {
  bot.command('start', async (ctx) => {
    const name = escapeHtml(ctx.user.name);
    await ctx.reply(
      [
        `👋 Olá, <b>${name}</b>!`,
        '',
        'Eu acompanho os animes que você e a galera estão assistindo: você monta a sua lista e eu guardo o seu progresso.',
        '',
        'Para começar, busque um anime com <code>/buscar &lt;nome&gt;</code>.',
        'Veja todos os comandos em /ajuda.',
      ].join('\n'),
      HTML_OPTIONS,
    );
  });
}
