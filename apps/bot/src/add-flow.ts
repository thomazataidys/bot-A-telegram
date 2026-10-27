import {
  AnimeAlreadyInListError,
  addAnimeByAnilistId,
  addAnimeByMalId,
} from '@animebot/core';
import type { ListEntryWithAnime, ParsedAnimeInput } from '@animebot/core';
import { replyWithSearchResults } from './commands/search.js';
import type { BotContext } from './context.js';
import { entryKeyboard, formatEntry } from './keyboards/entry.js';
import { HTML_OPTIONS } from './messages.js';

export type AddOutcome = 'added' | 'already';

/** Adiciona à lista de quem pediu e responde com o card; se já existir, mostra a entrada atual. */
export async function addAndReply(
  ctx: BotContext,
  add: () => Promise<ListEntryWithAnime>,
): Promise<AddOutcome> {
  try {
    const entry = await add();
    await ctx.reply(`✅ Adicionado à sua lista:\n\n${formatEntry(entry)}`, {
      ...HTML_OPTIONS,
      reply_markup: entryKeyboard(entry),
    });
    return 'added';
  } catch (error) {
    if (!(error instanceof AnimeAlreadyInListError)) throw error;
    await ctx.reply(`Já está na sua lista:\n\n${formatEntry(error.entry)}`, {
      ...HTML_OPTIONS,
      reply_markup: entryKeyboard(error.entry),
    });
    return 'already';
  }
}

/**
 * Link da AniList/MAL entra direto; Crunchyroll e texto livre mostram até 3 opções
 * em botões. Um novo anime é sincronizado (syncSingleAnime) dentro do core ao adicionar.
 */
export async function handleAnimeInput(
  ctx: BotContext,
  input: ParsedAnimeInput | { type: 'search_query'; searchQuery: string },
): Promise<void> {
  switch (input.type) {
    case 'anilist':
      await addAndReply(ctx, () => addAnimeByAnilistId(input.anilistId, { userId: ctx.user.id }));
      return;
    case 'mal':
      await addAndReply(ctx, () => addAnimeByMalId(input.malId, { userId: ctx.user.id }));
      return;
    case 'crunchyroll':
      await replyWithSearchResults(ctx, input.searchQuery, 3, 'Link da Crunchyroll, opções para');
      return;
    case 'plus_query':
    case 'search_query':
      await replyWithSearchResults(ctx, input.searchQuery, 3);
      return;
  }
}
