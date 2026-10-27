import type { ListEntryWithAnime } from '@animebot/core';
import { displayTitle, escapeHtml } from '@animebot/core';
import { InlineKeyboard } from 'grammy';
import type { AniListMedia } from '@animebot/core';
import { truncate } from '../messages.js';

type ListStatus = ListEntryWithAnime['status'];

export const STATUS_LABELS: Record<ListStatus, string> = {
  ASSISTINDO: '▶️ Assistindo',
  QUERO_VER: '🕒 Quero ver',
  COMPLETO: '✅ Completo',
};

export function mediaTitle(media: AniListMedia): string {
  return displayTitle({ titleEnglish: media.title.english, titleRomaji: media.title.romaji });
}

/** Linha "ep 3/12" com total desconhecido tratado. */
export function formatProgress(
  entry: Pick<ListEntryWithAnime, 'progress'> & {
    anime: Pick<ListEntryWithAnime['anime'], 'totalEpisodes'>;
  },
): string {
  return `ep ${entry.progress}/${entry.anime.totalEpisodes ?? '?'}`;
}

/** Bloco de texto HTML de uma entrada da lista. */
export function formatEntry(entry: ListEntryWithAnime): string {
  const title = escapeHtml(displayTitle(entry.anime));
  const link = `<a href="${escapeHtml(entry.anime.siteUrl)}">${title}</a>`;
  return `<b>${link}</b>\n${STATUS_LABELS[entry.status]} · ${formatProgress(entry)}`;
}

/** Letra usada no callback `st:<entryId>:<letra>` para cada status. */
export const STATUS_BY_LETTER: Record<string, ListStatus> = {
  A: 'ASSISTINDO',
  Q: 'QUERO_VER',
  C: 'COMPLETO',
};

/**
 * Botões da entrada (6.4). Com `offerComplete`, acrescenta a pergunta
 * "Marcar como completo?" (usada ao chegar no último episódio).
 */
export function entryKeyboard(
  entry: Pick<ListEntryWithAnime, 'id'>,
  options: { offerComplete?: boolean } = {},
): InlineKeyboard {
  const keyboard = new InlineKeyboard()
    .text('➕1 ep', `inc:${entry.id}`)
    .text('✏️ Definir ep', `setep:${entry.id}`)
    .row();
  for (const [letter, status] of Object.entries(STATUS_BY_LETTER)) {
    keyboard.text(STATUS_LABELS[status], `st:${entry.id}:${letter}`);
  }
  keyboard.row().text('🗑 Remover', `rm:${entry.id}`);
  if (options.offerComplete) keyboard.row().text('✅ Marcar como completo?', `st:${entry.id}:C`);
  return keyboard;
}

/** Card da entrada: texto e botões, com a pergunta de completo quando chegou ao fim. */
export function entryCard(
  entry: ListEntryWithAnime,
  options: { offerComplete?: boolean } = {},
): { text: string; reply_markup: InlineKeyboard } {
  const text = options.offerComplete
    ? `${formatEntry(entry)}\n\n🎉 Você chegou ao último episódio! Marcar como completo?`
    : formatEntry(entry);
  return { text, reply_markup: entryKeyboard(entry, options) };
}

/** Botão por entrada da lista para abrir o card (callback `ent:<entryId>`). */
export function openEntryKeyboard(entries: ListEntryWithAnime[], firstNumber = 1): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  entries.forEach((entry, i) => {
    keyboard
      .text(`⚙️ ${firstNumber + i}. ${truncate(displayTitle(entry.anime), 35)}`, `ent:${entry.id}`)
      .row();
  });
  return keyboard;
}

/** Escolha entre animes ambíguos do /vi (callback `vi:<entryId>:<ep>`). */
export function pickEpisodeEntryKeyboard(
  entries: ListEntryWithAnime[],
  episode: number,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const entry of entries) {
    keyboard.text(truncate(displayTitle(entry.anime), 45), `vi:${entry.id}:${episode}`).row();
  }
  return keyboard;
}

/** Um botão "➕ Título" por resultado de busca (callback `add:<anilistId>`). */
export function searchResultsKeyboard(results: AniListMedia[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  results.forEach((media, index) => {
    keyboard.text(`➕ ${index + 1}. ${truncate(mediaTitle(media), 40)}`, `add:${media.id}`).row();
  });
  return keyboard;
}

export function removeConfirmKeyboard(entryId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Sim, remover', `rmc:${entryId}`)
    .text('↩️ Cancelar', `rmn:${entryId}`);
}

/** Um botão por entrada para escolher qual remover (callback `rm:<entryId>`). */
export function pickEntryKeyboard(entries: ListEntryWithAnime[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const entry of entries) {
    keyboard.text(`🗑 ${truncate(displayTitle(entry.anime), 45)}`, `rm:${entry.id}`).row();
  }
  return keyboard;
}
