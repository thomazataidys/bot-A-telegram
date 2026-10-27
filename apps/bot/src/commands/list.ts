import {
  UserNotFoundError,
  displayTitle,
  escapeHtml,
  getUserList,
  getUserListByUsername,
} from '@animebot/core';
import type { ListEntryWithAnime } from '@animebot/core';
import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';
import { STATUS_LABELS, formatProgress, openEntryKeyboard } from '../keyboards/entry.js';
import { HTML_OPTIONS, chunkLines } from '../messages.js';

/** Entradas por mensagem: limita o tamanho do texto e o número de botões. */
const PAGE_SIZE = 10;

const STATUS_ORDER = ['ASSISTINDO', 'QUERO_VER', 'COMPLETO'] as const;

function entryLine(entry: ListEntryWithAnime, number: number): string {
  const title = `<a href="${escapeHtml(entry.anime.siteUrl)}">${escapeHtml(displayTitle(entry.anime))}</a>`;
  return `${number}. ${title} — ${formatProgress(entry)}`;
}

async function replyWithOtherUserList(ctx: BotContext, handle: string): Promise<void> {
  const list = await getUserListByUsername(handle).catch((error: unknown) => {
    if (error instanceof UserNotFoundError) return null;
    throw error;
  });
  if (!list?.user.active) {
    await ctx.reply(`Não encontrei o usuário "${handle}".`);
    return;
  }

  const name = escapeHtml(list.user.name);
  if (list.totalCount === 0) {
    await ctx.reply(`A lista de <b>${name}</b> está vazia.`, HTML_OPTIONS);
    return;
  }
  const lines = [`<b>Lista de ${name}</b>`];
  for (const status of STATUS_ORDER) {
    const entries = list[status];
    if (entries.length === 0) continue;
    lines.push('', `<b>${STATUS_LABELS[status]}</b> (${entries.length})`);
    entries.forEach((entry, i) => lines.push(entryLine(entry, i + 1)));
  }
  for (const chunk of chunkLines(lines)) await ctx.reply(chunk, HTML_OPTIONS);
}

export function registerList(bot: Bot<BotContext>): void {
  bot.command('lista', async (ctx) => {
    const handle = ctx.match.trim();
    if (handle !== '') {
      await replyWithOtherUserList(ctx, handle);
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
        await ctx.reply([header, '', ...lines].join('\n'), {
          ...HTML_OPTIONS,
          reply_markup: openEntryKeyboard(page, start + 1),
        });
      }
    }
  });
}
