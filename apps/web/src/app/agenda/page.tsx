import * as React from 'react';
import type { Metadata } from 'next';
import { getSchedule, listUsersWithStats } from '@animebot/core';
import { WeekCalendar } from '@/components/week-calendar';
import {
  serializeScheduleResult,
  serializeUserWithStats,
} from '@/lib/serialize';

export const metadata: Metadata = {
  title: 'Agenda Semanal',
};

export const dynamic = 'force-dynamic';

interface AgendaSearchParams {
  semana?: string;
  offset?: string;
  usuario?: string;
  userId?: string;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<AgendaSearchParams>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const isNextWeek =
    params.semana === 'proxima' ||
    params.semana === '1' ||
    params.offset === '1';
  const selectedUserId = params.usuario ?? params.userId ?? 'ALL';

  const [rawCurrentWeek, rawNextWeek, rawUsers] = await Promise.all([
    getSchedule({ offsetWeeks: 0 }),
    getSchedule({ offsetWeeks: 1 }),
    listUsersWithStats(),
  ]);

  const currentWeek = serializeScheduleResult(rawCurrentWeek);
  const nextWeek = serializeScheduleResult(rawNextWeek);
  const users = rawUsers
    .filter((u) => u.active)
    .map(serializeUserWithStats);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Agenda Semanal
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grade de lançamentos de segunda a domingo, já com o atraso configurado
          para o episódio sair legendado.
        </p>
      </div>

      <WeekCalendar
        currentWeek={currentWeek}
        nextWeek={nextWeek}
        users={users}
        initialOffset={isNextWeek ? 1 : 0}
        initialUserId={selectedUserId}
        syncUrlQuery
      />
    </div>
  );
}
