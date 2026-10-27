import {
  EntryNotFoundError,
  UnauthorizedEntryAccessError,
  displayTitle,
  escapeHtml,
  findUserEntriesByTitle,
  getEntryById,
  removeEntry,
} from '@animebot/core';
import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';
import { editCard } from '../cards.js';
import { pickEntryKeyboard, removeConfirmKeyboard } from '../keyboards/entry.js';
import { HTML_OPTIONS, NOT_OWNER_TEXT } from '../messages.js';

const MAX_CANDIDATES = 8;

export function registerRemove(bot: Bot<BotContext>): void {
  bot.command('remover', async (ctx) => {
    const query = ctx.match.trim();
    if (query === '') {
      await ctx.reply('Use /remover <nome do anime>. Exemplo: /remover solo leveling');
      return;
    }

    const entries = await findUserEntriesByTitle(ctx.user.id, query);
    const [first] = entries;
    if (!first) {
      await ctx.reply(`Não encontrei "${query}" na sua lista.`);
    } else if (entries.length === 1) {
      await sendConfirmation(ctx, first.id, displayTitle(first.anime));
    } else {
      await ctx.reply('Encontrei mais de um anime. Qual você quer remover?', {
        reply_markup: pickEntryKeyboard(entries.slice(0, MAX_CANDIDATES)),
      });
    }
  });

  // Pede confirmação (vem do /lista ou da escolha entre vários resultados).
  bot.callbackQuery(/^rm:(.+)$/, async (ctx) => {
    const entry = await getEntryById(ctx.match[1] as string);
    if (entry.userId !== ctx.user.id) {
      await ctx.answerCallbackQuery({ text: NOT_OWNER_TEXT, show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await sendConfirmation(ctx, entry.id, displayTitle(entry.anime));
  });

  bot.callbackQuery(/^rmc:(.+)$/, async (ctx) => {
    try {
      const removed = await removeEntry(ctx.match[1] as string, ctx.user.id);
      await ctx.answerCallbackQuery({ text: 'Removido.' });
      await editCard(
        ctx,
        `🗑 <b>${escapeHtml(displayTitle(removed.anime))}</b> foi removido da sua lista.`,
      );
    } catch (error) {
      if (error instanceof UnauthorizedEntryAccessError) {
        await ctx.answerCallbackQuery({ text: NOT_OWNER_TEXT, show_alert: true });
      } else if (error instanceof EntryNotFoundError) {
        await ctx.answerCallbackQuery({ text: 'Esse anime já foi removido.' });
        await ctx.editMessageReplyMarkup();
      } else {
        throw error;
      }
    }
  });

  bot.callbackQuery(/^rmn:(.+)$/, async (ctx) => {
    try {
      const entry = await getEntryById(ctx.match[1] as string);
      if (entry.userId !== ctx.user.id) {
        await ctx.answerCallbackQuery({ text: NOT_OWNER_TEXT, show_alert: true });
        return;
      }
    } catch (error) {
      // Entrada já removida: só encerra o prompt.
      if (!(error instanceof EntryNotFoundError)) throw error;
    }
    await ctx.answerCallbackQuery({ text: 'Cancelado.' });
    await editCard(ctx, 'Remoção cancelada.');
  });
}

function sendConfirmation(ctx: BotContext, entryId: string, title: string): Promise<unknown> {
  return ctx.reply(`Remover <b>${escapeHtml(title)}</b> da sua lista?`, {
    ...HTML_OPTIONS,
    reply_markup: removeConfirmKeyboard(entryId),
  });
}
