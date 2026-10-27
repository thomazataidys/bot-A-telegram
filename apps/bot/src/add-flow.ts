import {
  AnimeAlreadyInListError,
  addAnimeByAnilistId,
  addAnimeByMalId,
} from '@animebot/core';
import type { ListEntryWithAnime, ParsedAnimeInput } from '@animebot/core';
import { replyWithSearchResults } from './commands/search.js';
import type { BotContext } from './context.js';
import { entryKeyboard, formatEntry, saveProgressKeyboard } from './keyboards/entry.js';
import { HTML_OPTIONS } from './messages.js';

export type AddOutcome = 'added' | 'already';

/** Pergunta se quer salvar o episódio do link como progresso (só se ainda não for o atual). */
async function suggestProgress(
  ctx: BotContext,
  entry: ListEntryWithAnime,
  episode: number | undefined,
): Promise<void> {
  if (episode === undefined || entry.progress === episode) return;
  await ctx.reply(`Salvar o episódio ${episode} como o seu progresso?`, {
    reply_markup: saveProgressKeyboard(entry.id, episode),
  });
}

/**
 * Adiciona à lista de quem pediu e responde com o card; se já existir, mostra a entrada atual.
 * Com `episode` (compartilhamento da Crunchyroll), sugere salvar o progresso nesse episódio.
 */
export async function addAndReply(
  ctx: BotContext,
  add: () => Promise<ListEntryWithAnime>,
  episode?: number,
): Promise<AddOutcome> {
  try {
    const entry = await add();
    await ctx.reply(`✅ Adicionado à sua lista:\n\n${formatEntry(entry)}`, {
      ...HTML_OPTIONS,
      reply_markup: entryKeyboard(entry),
    });
    await suggestProgress(ctx, entry, episode);
    return 'added';
  } catch (error) {
    if (!(error instanceof AnimeAlreadyInListError)) throw error;
    await ctx.reply(`Já está na sua lista:\n\n${formatEntry(error.entry)}`, {
      ...HTML_OPTIONS,
      reply_markup: entryKeyboard(error.entry),
    });
    await suggestProgress(ctx, error.entry, episode);
    return 'already';
  }
}

function crunchyrollEpisodeIntro(season?: number, episode?: number): string {
  const details = [season === undefined ? null : `T${season}`, episode === undefined ? null : `ep ${episode}`]
    .filter(Boolean)
    .join(' ');
  return `Episódio da Crunchyroll${details ? ` (${details})` : ''}, opções para`;
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
    case 'crunchyroll-episode':
      await replyWithSearchResults(
        ctx,
        input.title,
        3,
        crunchyrollEpisodeIntro(input.season, input.episode),
        { season: input.season, episode: input.episode },
      );
      return;
    case 'plus_query':
    case 'search_query':
      await replyWithSearchResults(ctx, input.searchQuery, 3);
      return;
  }
}
