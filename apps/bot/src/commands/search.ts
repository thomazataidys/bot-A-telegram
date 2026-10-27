import { escapeHtml, searchAnimeForSeason } from '@animebot/core';
import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';
import { sendAnimeCard } from '../cards.js';
import { addResultKeyboard, mediaImage, searchResultCaption } from '../keyboards/entry.js';
import { HTML_OPTIONS } from '../messages.js';

/** Busca na AniList e responde com uma foto por resultado, cada uma com "➕ Adicionar". */
export async function replyWithSearchResults(
  ctx: BotContext,
  query: string,
  limit: number,
  intro = 'Resultados para',
  { season, episode }: { season?: number; episode?: number } = {},
): Promise<void> {
  const results = await searchAnimeForSeason(query, season, limit);
  if (results.length === 0) {
    await ctx.reply(`Nenhum anime encontrado para <b>${escapeHtml(query)}</b>.`, HTML_OPTIONS);
    return;
  }

  await ctx.reply(`${escapeHtml(intro)} <b>${escapeHtml(query)}</b>:`, HTML_OPTIONS);
  // Uma foto por opção, na ordem do ranking, cada uma com o seu botão de adicionar.
  for (const [index, media] of results.entries()) {
    await sendAnimeCard(ctx, {
      imageUrl: mediaImage(media),
      caption: searchResultCaption(media, index),
      keyboard: addResultKeyboard(media, episode),
    });
  }
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
