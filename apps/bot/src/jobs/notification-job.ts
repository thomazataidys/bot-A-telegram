import { escapeHtml, formatUserMention, processPendingNotifications } from '@animebot/core';
import type { PendingNotification } from '@animebot/core';
import type { Api } from 'grammy';
import type { InlineKeyboardMarkup } from 'grammy/types';
import { sendAnimeCard } from '../cards.js';

export function notificationText(notification: PendingNotification): string {
  const mentions = notification.watchers.map((w) => formatUserMention(w.user)).join(' ');
  return [
    '🔔 Episódio novo!',
    `<b>${escapeHtml(notification.displayTitle)}</b> — episódio ${notification.episode} já deve estar disponível.`,
    mentions,
  ].join('\n');
}

/** Banner (imagem larga) do anime, com a capa de reserva. */
export function notificationImage(notification: PendingNotification): string | null {
  return notification.anime.bannerUrl ?? notification.anime.coverUrl ?? null;
}

export function notificationKeyboard(notification: PendingNotification): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '✅ Vi',
          callback_data: `watched:${notification.anime.id}:${notification.episode}`,
        },
        { text: '🔗 AniList', url: notification.anime.siteUrl },
      ],
    ],
  };
}

export async function runNotificationJob(api: Api): Promise<void> {
  try {
    const result = await processPendingNotifications(async (notification, groupChatId) => {
      await sendAnimeCard(
        api,
        {
          imageUrl: notificationImage(notification),
          caption: notificationText(notification),
          keyboard: notificationKeyboard(notification),
        },
        groupChatId,
      );
    });
    if (result.sentCount > 0 || result.failedCount > 0) {
      console.log(
        `Notificações: ${result.sentCount} enviada(s), ${result.skippedNoWatchersCount} sem interessados, ${result.failedCount} falha(s)`,
      );
    }
  } catch (error) {
    console.error('Erro no job de notificações:', error);
  }
}
