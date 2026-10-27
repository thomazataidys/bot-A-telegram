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

/** Botões da entrada (Fase 4: apenas remover; as demais ações entram na Fase 5). */
export function entryKeyboard(entry: Pick<ListEntryWithAnime, 'id'>): InlineKeyboard {
  return new InlineKeyboard().text('🗑 Remover', `rm:${entry.id}`);
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
