import { escapeHtml, getGlobalList } from '@animebot/core';
import type { GlobalAnimeItem, GlobalAnimeWatcher } from '@animebot/core';
import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';
import { HTML_OPTIONS, chunkLines } from '../messages.js';

const STATUS_SUFFIX: Record<GlobalAnimeWatcher['status'], string> = {
  ASSISTINDO: '',
  QUERO_VER: ' 🕒',
  COMPLETO: ' ✅',
};

export function formatWatcher(watcher: GlobalAnimeWatcher): string {
  return `${escapeHtml(watcher.user.name)} (ep ${watcher.progress}${STATUS_SUFFIX[watcher.status]})`;
}

export function formatGlobalItem(item: GlobalAnimeItem): string {
  const title = `<a href="${escapeHtml(item.anime.siteUrl)}">${escapeHtml(item.displayTitle)}</a>`;
  return `• ${title} — ${item.watchers.map(formatWatcher).join(', ')}`;
}

export function registerGlobal(bot: Bot<BotContext>): void {
  bot.command('global', async (ctx) => {
    const items = (await getGlobalList())
      .map((item) => ({ ...item, watchers: item.watchers.filter((w) => w.user.active) }))
      .filter((item) => item.watchers.length > 0);

    if (items.length === 0) {
      await ctx.reply('Ainda não há animes nas listas. Use /buscar <nome> para adicionar.');
      return;
    }

    const lines = ['<b>🌐 Lista global</b>', '', ...items.map(formatGlobalItem)];
    for (const chunk of chunkLines(lines)) await ctx.reply(chunk, HTML_OPTIONS);
  });
}
