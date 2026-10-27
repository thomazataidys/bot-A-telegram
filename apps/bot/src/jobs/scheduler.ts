import { getSettings } from '@animebot/core';
import type { Api } from 'grammy';
import cron from 'node-cron';
import { runNotificationJob } from './notification-job.js';
import { runSyncJob } from './sync-job.js';

/**
 * Sync ao iniciar; depois, a cada syncIntervalMinutes (lido das configurações a cada minuto,
 * então mudanças no painel valem sem reiniciar) e notificações a cada 5 minutos.
 */
export function startScheduler(api: Api): { stop: () => void } {
  let lastSyncStartedAt = Date.now();
  void runSyncJob();

  const syncTask = cron.schedule('* * * * *', async () => {
    try {
      const { syncIntervalMinutes } = await getSettings();
      if (Date.now() - lastSyncStartedAt < syncIntervalMinutes * 60_000) return;
      lastSyncStartedAt = Date.now();
      await runSyncJob();
    } catch (error) {
      console.error('Erro ao agendar a sincronização:', error);
    }
  });
  const notificationTask = cron.schedule('*/5 * * * *', () => runNotificationJob(api));

  return {
    stop: () => {
      void syncTask.stop();
      void notificationTask.stop();
    },
  };
}
