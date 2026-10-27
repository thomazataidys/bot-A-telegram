import { escapeHtml, searchAnime } from '@animebot/core';
import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';
import { mediaTitle, searchResultsKeyboard } from '../keyboards/entry.js';
import { HTML_OPTIONS } from '../messages.js';

/** Busca na AniList e responde com os resultados e botões "➕ Adicionar". */
export async function replyWithSearchResults(
  ctx: BotContext,
  query: string,
  limit: number,
  intro = 'Resultados para',
): Promise<void> {
  const results = await searchAnime(query, limit);
  if (results.length === 0) {
    await ctx.reply(`Nenhum anime encontrado para <b>${escapeHtml(query)}</b>.`, HTML_OPTIONS);
    return;
  }

  const lines = results.map((media, index) => {
    const details = [media.format, media.episodes ? `${media.episodes} eps` : null]
      .filter(Boolean)
      .join(' · ');
    const title = `<a href="${escapeHtml(media.siteUrl)}">${escapeHtml(mediaTitle(media))}</a>`;
    return `${index + 1}. ${title}${details ? ` (${escapeHtml(details)})` : ''}`;
  });
  await ctx.reply(`${escapeHtml(intro)} <b>${escapeHtml(query)}</b>:\n\n${lines.join('\n')}`, {
    ...HTML_OPTIONS,
    reply_markup: searchResultsKeyboard(results),
  });
}

export function registerSearch(bot: Bot<BotContext>): void {
  bot.command('buscar', async (ctx) => {
    const query = ctx.match.trim();
    if (query === '') {
      await ctx.reply('Use /buscar <nome do anime>. Exemplo: /buscar solo leveling');
      return;
    }
    await replyWithSearchResults(ctx, query, 5);
  });
}
