'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays,
  Clock,
  ExternalLink,
  Filter,
  Tv,
  Users,
} from 'lucide-react';
import type {
  ScheduleDayGroup,
  ScheduleResult,
  UserWithStats,
} from '@/types/contracts';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface WeekCalendarProps {
  currentWeek: ScheduleResult;
  nextWeek?: ScheduleResult;
  users?: readonly UserWithStats[];
  initialOffset?: 0 | 1;
  selectedOffset?: 0 | 1;
  onOffsetChange?: (offset: 0 | 1) => void;
  initialUserId?: string;
  selectedUserId?: string;
  onUserChange?: (userId: string) => void;
  syncUrlQuery?: boolean;
}

export function WeekCalendar({
  currentWeek,
  nextWeek,
  users = [],
  initialOffset = 0,
  selectedOffset,
  onOffsetChange,
  initialUserId = 'ALL',
  selectedUserId: controlledUserId,
  onUserChange,
  syncUrlQuery = false,
}: WeekCalendarProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();

  const [internalOffset, setInternalOffset] =
    React.useState<0 | 1>(initialOffset);
  const [internalUserId, setInternalUserId] =
    React.useState<string>(initialUserId);

  const activeOffset = selectedOffset ?? internalOffset;
  const activeUserId = controlledUserId ?? internalUserId;

  const activeSchedule =
    activeOffset === 1 && nextWeek ? nextWeek : currentWeek;

  function updateUrlParams(offset: 0 | 1, userId: string): void {
    if (!syncUrlQuery) {
      return;
    }
    const params = new URLSearchParams();
    if (offset === 1) {
      params.set('semana', 'proxima');
    }
    if (userId && userId !== 'ALL') {
      params.set('usuario', userId);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handleOffsetSelect(offset: 0 | 1): void {
    setInternalOffset(offset);
    onOffsetChange?.(offset);
    updateUrlParams(offset, activeUserId);
  }

  function handleUserSelect(userId: string): void {
    setInternalUserId(userId);
    onUserChange?.(userId);
    updateUrlParams(activeOffset, userId);
  }

  const filteredDays: readonly ScheduleDayGroup[] = React.useMemo(() => {
    return activeSchedule.days
      .map((day) => ({
        ...day,
        items: day.items
          .map((item) => ({
            ...item,
            watchers: item.watchers.filter((w) => w.user.active),
          }))
          .filter((item) => {
            if (activeUserId === 'ALL') {
              return item.watchers.length > 0;
            }
            return item.watchers.some((w) => w.user.id === activeUserId);
          }),
      }))
      .filter((day) => day.items.length > 0);
  }, [activeSchedule.days, activeUserId]);

  const delayHoursLabel =
    activeSchedule.delayMinutes % 60 === 0
      ? `+${activeSchedule.delayMinutes / 60}h`
      : `+${activeSchedule.delayMinutes}min`;

  return (
    <div className="space-y-4">
      {/* Controles de Semana e Filtro de Usuário */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div
            role="tablist"
            aria-label="Selecionar semana"
            className="inline-flex rounded-lg border bg-muted/60 p-1 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeOffset === 0}
              onClick={() => handleOffsetSelect(0)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                activeOffset === 0
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Esta semana
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeOffset === 1}
              onClick={() => handleOffsetSelect(1)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                activeOffset === 1
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Próxima semana
            </button>
          </div>

          <Badge variant="outline" className="gap-1.5 text-xs py-1 px-2.5">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <span>{activeSchedule.weekRange.periodLabel}</span>
          </Badge>
        </div>

        {users.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Usuário:</span>
            </div>
            <select
              value={activeUserId}
              onChange={(e) => handleUserSelect(e.target.value)}
              aria-label="Filtrar agenda por usuário"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="ALL">Agenda global (todos)</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.username ? `(@${user.username})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Dias da semana: lista vertical no mobile, grid responsivo no desktop */}
      {filteredDays.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium">
              Nenhum episódio programado neste período
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Não há lançamentos previstos para os filtros selecionados entre{' '}
              {activeSchedule.weekRange.periodLabel}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDays.map((day) => (
            <Card key={day.dayKey} className="flex flex-col">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold">
                    {day.dayHeader}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {day.items.length} {day.items.length === 1 ? 'ep' : 'eps'}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Fuso: {activeSchedule.timezone}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-3 space-y-3 flex-1">
                {day.items.map((item) => (
                  <div
                    key={item.airingEpisode.id}
                    className="flex gap-3 rounded-lg border bg-background p-3 transition-colors hover:border-primary/40"
                  >
                    {item.anime.coverUrl ? (
                      <img
                        src={item.anime.coverUrl}
                        alt={item.displayTitle}
                        className="h-20 w-14 rounded-md object-cover border shrink-0 bg-muted"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-20 w-14 items-center justify-center rounded-md border bg-muted text-muted-foreground shrink-0">
                        <Tv className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">
                          <Clock className="h-3 w-3" />
                          {item.formattedTime}
                        </span>
                        <Badge variant="default" className="text-[11px]">
                          Ep. {item.episode}
                        </Badge>
                      </div>

                      <a
                        href={item.anime.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sm leading-snug hover:text-primary transition-colors inline-flex items-start gap-1 line-clamp-2"
                      >
                        <span>{item.displayTitle}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 mt-0.5 opacity-60" />
                      </a>

                      {item.watchers.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                          {item.watchers.map((watcher) => (
                            <span
                              key={watcher.entryId}
                              className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
                            >
                              {watcher.user.username
                                ? `@${watcher.user.username}`
                                : watcher.user.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center sm:text-right">
        Horários estimados para o legendado ({delayHoursLabel} do Japão).
      </p>
    </div>
  );
}
