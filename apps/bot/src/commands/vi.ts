import {
  AmbiguousEntryMatchError,
  EntryNotFoundError,
  setProgress,
  setProgressByTitle,
} from '@animebot/core';
import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';
import { entryCard, pickEpisodeEntryKeyboard } from '../keyboards/entry.js';
import { HTML_OPTIONS } from '../messages.js';

const MAX_CANDIDATES = 8;
const USAGE = 'Use /vi <nome do anime> <episódio>. Exemplo: /vi solo leveling 5';

/** O último token é o episódio; o prefixo é o nome. */
export function parseViArgs(args: string): { query: string; episode: number } | null {
  const match = /^(.+?)\s+(\d{1,6})$/.exec(args.trim());
  if (!match) return null;
  return { query: (match[1] as string).trim(), episode: Number(match[2]) };
}

async function replyWithEntry(
  ctx: BotContext,
  result: Awaited<ReturnType<typeof setProgress>>,
): Promise<void> {
  const { text, reply_markup } = entryCard(result.entry, {
    offerComplete: result.reachedTotalEpisodes,
  });
  await ctx.reply(`📺 Progresso atualizado:\n\n${text}`, { ...HTML_OPTIONS, reply_markup });
}

export function registerVi(bot: Bot<BotContext>): void {
  bot.command('vi', async (ctx) => {
    const parsed = parseViArgs(ctx.match);
    if (!parsed) {
      await ctx.reply(USAGE);
      return;
    }

    try {
      await replyWithEntry(
        ctx,
        await setProgressByTitle(ctx.user.id, parsed.query, parsed.episode),
      );
    } catch (error) {
      if (error instanceof EntryNotFoundError) {
        await ctx.reply(`Não encontrei "${parsed.query}" na sua lista.`);
      } else if (error instanceof AmbiguousEntryMatchError) {
        await ctx.reply(
          `Encontrei mais de um anime para "${parsed.query}". Qual você quer atualizar para o episódio ${parsed.episode}?`,
          {
            reply_markup: pickEpisodeEntryKeyboard(
              error.candidates.slice(0, MAX_CANDIDATES),
              parsed.episode,
            ),
          },
        );
      } else {
        throw error;
      }
    }
  });

  bot.callbackQuery(/^vi:([^:]+):(\d{1,6})$/, async (ctx) => {
    const result = await setProgress(ctx.match[1] as string, Number(ctx.match[2]), ctx.user.id);
    await ctx.answerCallbackQuery({ text: `Episódio ${result.entry.progress}` });
    await replyWithEntry(ctx, result);
  });
}
