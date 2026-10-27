import { setSetting } from '@animebot/core';
import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';

/** IDs do Telegram autorizados a configurar o grupo (env ADMIN_TELEGRAM_IDS, separados por vírgula). */
export function parseAdminIds(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== ''),
  );
}

export function registerConfigGroup(bot: Bot<BotContext>): void {
  bot.command('configurargrupo', async (ctx) => {
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
      await ctx.reply('Use este comando dentro do grupo que vai receber os avisos.');
      return;
    }
    if (!parseAdminIds(process.env['ADMIN_TELEGRAM_IDS']).has(String(ctx.from?.id))) {
      await ctx.reply('Só administradores do bot podem configurar o grupo.');
      return;
    }
    await setSetting('groupChatId', String(ctx.chat.id));
    await ctx.reply('✅ Pronto! Este grupo receberá os avisos de episódios novos.');
  });
}
