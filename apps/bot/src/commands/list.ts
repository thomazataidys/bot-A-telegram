import { displayTitle, escapeHtml, getUserList } from '@animebot/core';
import type { ListEntryWithAnime } from '@animebot/core';
import { InlineKeyboard } from 'grammy';
import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';
import { STATUS_LABELS, formatProgress } from '../keyboards/entry.js';
import { HTML_OPTIONS, truncate } from '../messages.js';

/** Entradas por mensagem: limita o tamanho do texto e o número de botões. */
const PAGE_SIZE = 10;

const STATUS_ORDER = ['ASSISTINDO', 'QUERO_VER', 'COMPLETO'] as const;

function entryLine(entry: ListEntryWithAnime, number: number): string {
  const title = `<a href="${escapeHtml(entry.anime.siteUrl)}">${escapeHtml(displayTitle(entry.anime))}</a>`;
  return `${number}. ${title} — ${formatProgress(entry)}`;
}

export function registerList(bot: Bot<BotContext>): void {
  bot.command('lista', async (ctx) => {
    // /lista @usuario entra na Fase 5.
    if (ctx.match.trim() !== '') {
      await ctx.reply('Por enquanto só consigo mostrar a sua própria lista: use /lista.');
      return;
    }

    const list = await getUserList(ctx.user.id);
    if (list.totalCount === 0) {
      await ctx.reply(
        'Sua lista está vazia. Use /buscar <nome> ou /add <nome> para adicionar um anime.',
      );
      return;
    }

    for (const status of STATUS_ORDER) {
      const entries = list[status];
      for (let start = 0; start < entries.length; start += PAGE_SIZE) {
        const page = entries.slice(start, start + PAGE_SIZE);
        const header = `<b>${STATUS_LABELS[status]}</b> (${entries.length})${start > 0 ? ' — continuação' : ''}`;
        const lines = page.map((entry, i) => entryLine(entry, start + i + 1));
        const keyboard = new InlineKeyboard();
        page.forEach((entry, i) => {
          keyboard
            .text(
              `🗑 ${start + i + 1}. ${truncate(displayTitle(entry.anime), 35)}`,
              `rm:${entry.id}`,
            )
            .row();
        });
        await ctx.reply([header, '', ...lines].join('\n'), {
          ...HTML_OPTIONS,
          reply_markup: keyboard,
        });
      }
    }
  });
}
