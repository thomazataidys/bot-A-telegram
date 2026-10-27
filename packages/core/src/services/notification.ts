import { ListStatus, prisma } from '@animebot/db';
import type { AiringEpisode, Anime, User } from '@animebot/db';
import { displayTitle } from '../utils/title.js';
import { recordNotificationSent } from './runtime-status.js';
import { getSettings } from './settings.js';

export interface NotificationWatcher {
  user: Pick<User, 'id' | 'name' | 'username' | 'telegramId'>;
  progress: number;
}

export interface PendingNotification {
  airingEpisode: AiringEpisode;
  anime: Anime;
  displayTitle: string;
  episode: number;
  /** Apenas usuários active=true com status ASSISTINDO ou QUERO_VER. */
  watchers: NotificationWatcher[];
}

export interface NotificationRunResult {
  processedCount: number;
  sentCount: number;
  skippedNoWatchersCount: number;
  failedCount: number;
  groupChatNotConfigured: boolean;
}

export type SendNotificationCallback = (
  notification: PendingNotification,
  groupChatId: string,
) => Promise<void>;

/**
 * Busca AiringEpisodes com notifiedAt = null e (airingAt + delayMinutes <= now),
 * anexando os usuários ativos que têm o anime em ASSISTINDO ou QUERO_VER.
 */
export async function getPendingNotifications(
  now: Date = new Date(),
): Promise<PendingNotification[]> {
  const { notificationDelayMinutes } = await getSettings();
  const dueBefore = new Date(now.getTime() - notificationDelayMinutes * 60_000);

  const episodes = await prisma.airingEpisode.findMany({
    where: { notifiedAt: null, airingAt: { lte: dueBefore } },
    orderBy: { airingAt: 'asc' },
    include: {
      anime: {
        include: {
          entries: {
            where: {
              status: { in: [ListStatus.ASSISTINDO, ListStatus.QUERO_VER] },
              user: { active: true },
            },
            include: { user: true },
          },
        },
      },
    },
  });

  return episodes.map(({ anime: { entries, ...anime }, ...airingEpisode }) => ({
    airingEpisode,
    anime,
    displayTitle: displayTitle(anime),
    episode: airingEpisode.episode,
    watchers: entries.map((entry) => ({
      user: {
        id: entry.user.id,
        name: entry.user.name,
        username: entry.user.username,
        telegramId: entry.user.telegramId,
      },
      progress: entry.progress,
    })),
  }));
}

/** Marca um AiringEpisode como notificado. */
export async function markEpisodeNotified(
  airingEpisodeId: string,
  notifiedAt: Date = new Date(),
): Promise<void> {
  await prisma.airingEpisode.update({ where: { id: airingEpisodeId }, data: { notifiedAt } });
}

let processing = false;

/**
 * Executa o ciclo de notificações (seção 7.2). Sem lote em paralelo: se uma execução
 * já estiver em andamento, retorna um resultado vazio. notifiedAt só é gravado depois
 * que sendFn resolve; em erro, o episódio é tentado de novo no próximo ciclo.
 */
export async function processPendingNotifications(
  sendFn: SendNotificationCallback,
  now: Date = new Date(),
): Promise<NotificationRunResult> {
  const result: NotificationRunResult = {
    processedCount: 0,
    sentCount: 0,
    skippedNoWatchersCount: 0,
    failedCount: 0,
    groupChatNotConfigured: false,
  };
  if (processing) return result;
  processing = true;
  try {
    const { groupChatId } = await getSettings();
    if (groupChatId === null) {
      console.warn('Notificações: groupChatId não configurado; use /configurargrupo no grupo.');
      result.groupChatNotConfigured = true;
      return result;
    }

    for (const notification of await getPendingNotifications(now)) {
      result.processedCount += 1;
      if (notification.watchers.length === 0) {
        await markEpisodeNotified(notification.airingEpisode.id, now);
        result.skippedNoWatchersCount += 1;
        continue;
      }
      try {
        await sendFn(notification, groupChatId);
      } catch (error) {
        console.error(
          `Notificações: falha ao avisar ${notification.displayTitle} ep ${notification.episode}:`,
          error,
        );
        result.failedCount += 1;
        continue;
      }
      await markEpisodeNotified(notification.airingEpisode.id, now);
      result.sentCount += 1;
    }
    if (result.sentCount > 0) await recordNotificationSent(new Date());
    return result;
  } finally {
    processing = false;
  }
}
