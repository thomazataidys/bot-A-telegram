import {
  InvalidEpisodeNumberError,
  displayTitle,
  escapeHtml,
  getEntryById,
  incrementProgress,
  setProgress,
  setStatus,
} from '@animebot/core';
import type { ListEntryWithAnime } from '@animebot/core';
import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';
import { STATUS_BY_LETTER, entryCard } from '../keyboards/entry.js';
import { HTML_OPTIONS, NOT_OWNER_TEXT } from '../messages.js';
import { pendingEpisodes, pendingKey } from '../pending.js';

/** Busca a entrada e confirma que é de quem clicou; senão avisa e devolve null. */
async function getOwnEntry(ctx: BotContext, entryId: string): Promise<ListEntryWithAnime | null> {
  const entry = await getEntryById(entryId);
  if (entry.userId !== ctx.user.id) {
    await ctx.answerCallbackQuery({ text: NOT_OWNER_TEXT, show_alert: true });
    return null;
  }
  return entry;
}

/** Atualiza a mensagem do botão clicado com o novo estado da entrada. */
async function refreshCard(
  ctx: BotContext,
  entry: ListEntryWithAnime,
  offerComplete = false,
): Promise<void> {
  const { text, reply_markup } = entryCard(entry, { offerComplete });
  await ctx.editMessageText(text, { ...HTML_OPTIONS, reply_markup });
}

export function registerEntryActions(bot: Bot<BotContext>): void {
  // Abre o card de uma entrada da /lista.
  bot.callbackQuery(/^ent:(.+)$/, async (ctx) => {
    const entry = await getOwnEntry(ctx, ctx.match[1] as string);
    if (!entry) return;
    await ctx.answerCallbackQuery();
    const { text, reply_markup } = entryCard(entry);
    await ctx.reply(text, { ...HTML_OPTIONS, reply_markup });
  });

  bot.callbackQuery(/^inc:(.+)$/, async (ctx) => {
    const { entry, reachedTotalEpisodes } = await incrementProgress(
      ctx.match[1] as string,
      ctx.user.id,
    );
    await ctx.answerCallbackQuery({ text: `Episódio ${entry.progress}` });
    await refreshCard(ctx, entry, reachedTotalEpisodes);
  });

  bot.callbackQuery(/^st:([^:]+):([AQC])$/, async (ctx) => {
    const status = STATUS_BY_LETTER[ctx.match[2] as string];
    if (!status) return;
    const entry = await setStatus(ctx.match[1] as string, status, ctx.user.id);
    await ctx.answerCallbackQuery({ text: 'Status atualizado.' });
    await refreshCard(ctx, entry);
  });

  // Pergunta o número e espera a próxima mensagem do mesmo usuário (handler abaixo).
  bot.callbackQuery(/^setep:(.+)$/, async (ctx) => {
    const entry = await getOwnEntry(ctx, ctx.match[1] as string);
    if (!entry || !ctx.chat) return;
    await ctx.answerCallbackQuery();
    const total = entry.anime.totalEpisodes;
    const prompt = await ctx.reply(
      `Qual episódio de <b>${escapeHtml(displayTitle(entry.anime))}</b> você já assistiu? ` +
        `Responda com o número${total === null ? '' : ` (0 a ${total})`}.`,
      { ...HTML_OPTIONS, reply_markup: { force_reply: true, selective: true } },
    );
    pendingEpisodes.set(pendingKey(ctx.chat.id, ctx.from.id), entry.id, prompt.message_id);
  });

  // Precisa vir antes de handlers de mensagens comuns (ex.: links na Fase 6).
  bot.on('message:text', async (ctx, next) => {
    const key = pendingKey(ctx.chat.id, ctx.from.id);
    const pending = pendingEpisodes.get(key);
    const text = ctx.message.text.trim();
    if (!pending || text.startsWith('/')) {
      await next();
      return;
    }

    if (!/^\d{1,6}$/.test(text)) {
      const repliesToPrompt = ctx.message.reply_to_message?.message_id === pending.promptMessageId;
      if (ctx.chat.type === 'private' || repliesToPrompt) {
        await ctx.reply('Envie só o número do episódio, por exemplo: 5');
      } else {
        await next();
      }
      return;
    }

    try {
      const { entry, reachedTotalEpisodes } = await setProgress(
        pending.entryId,
        Number(text),
        ctx.user.id,
      );
      pendingEpisodes.delete(key);
      const { text: cardText, reply_markup } = entryCard(entry, {
        offerComplete: reachedTotalEpisodes,
      });
      await ctx.reply(cardText, { ...HTML_OPTIONS, reply_markup });
    } catch (error) {
      if (error instanceof InvalidEpisodeNumberError) {
        await ctx.reply(`${error.message}. Envie outro número.`);
        return;
      }
      pendingEpisodes.delete(key);
      throw error;
    }
  });
}
