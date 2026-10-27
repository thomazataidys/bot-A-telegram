import { prisma } from '@animebot/db';
import { getRuntimeStatus } from './runtime-status.js';
import { getUpcomingEpisodes } from './schedule.js';
import type { ScheduleItem } from './schedule.js';

export interface DashboardStats {
  activeUsersCount: number;
  totalUsersCount: number;
  trackedAnimesCount: number;
  upcomingEpisodes48h: ScheduleItem[];
  lastSyncAt: Date | null;
  lastNotificationAt: Date | null;
}

/** Indicadores consolidados para a página inicial do painel. */
export async function getDashboardStats(now: Date = new Date()): Promise<DashboardStats> {
  const [activeUsersCount, totalUsersCount, trackedAnimesCount, upcomingEpisodes48h, status] =
    await Promise.all([
      prisma.user.count({ where: { active: true } }),
      prisma.user.count(),
      prisma.anime.count({ where: { entries: { some: {} } } }),
      getUpcomingEpisodes(48, now),
      getRuntimeStatus(),
    ]);
  return { activeUsersCount, totalUsersCount, trackedAnimesCount, upcomingEpisodes48h, ...status };
}
