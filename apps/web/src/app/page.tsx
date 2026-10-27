import * as React from 'react';
import type { Metadata } from 'next';
import { Bell, RefreshCw, Tv, Users } from 'lucide-react';
import { getDashboardStats, getSettings } from '@animebot/core';
import { StatCard } from '@/components/stat-card';
import { UpcomingEpisodesList } from '@/components/upcoming-episodes-list';
import { serializeScheduleItem } from '@/lib/serialize';
import { formatRelativeTimeBR } from '@/types/contracts';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export const dynamic = 'force-dynamic';

function formatExactDateTimeBR(
  date: Date | null,
  timezone: string,
): string {
  if (!date) {
    return 'Nenhum registro até o momento';
  }
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone || 'America/Fortaleza',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString('pt-BR');
  }
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const [stats, settings] = await Promise.all([
    getDashboardStats(),
    getSettings(),
  ]);

  const upcomingItems = stats.upcomingEpisodes48h
    .map(serializeScheduleItem)
    .filter((item) => item.watchers.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral do bot de animes, métricas do grupo e lançamentos das
          próximas 48 horas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Usuários"
          value={`${stats.activeUsersCount} / ${stats.totalUsersCount}`}
          subtitle="Usuários ativos / total cadastrados"
          badgeText="Telegram"
          icon={Users}
        />

        <StatCard
          title="Animes Monitorados"
          value={stats.trackedAnimesCount}
          subtitle="Títulos únicos presentes nas listas"
          badgeText="AniList"
          icon={Tv}
        />

        <StatCard
          title="Última Sincronização"
          value={formatRelativeTimeBR(stats.lastSyncAt)}
          subtitle={formatExactDateTimeBR(
            stats.lastSyncAt,
            settings.timezone,
          )}
          badgeText={`A cada ${settings.syncIntervalMinutes}m`}
          icon={RefreshCw}
        />

        <StatCard
          title="Última Notificação"
          value={formatRelativeTimeBR(stats.lastNotificationAt)}
          subtitle={formatExactDateTimeBR(
            stats.lastNotificationAt,
            settings.timezone,
          )}
          badgeText={`+${settings.notificationDelayMinutes}m JP`}
          icon={Bell}
        />
      </div>

      <UpcomingEpisodesList
        items={upcomingItems}
        delayMinutes={settings.notificationDelayMinutes}
      />
    </div>
  );
}
