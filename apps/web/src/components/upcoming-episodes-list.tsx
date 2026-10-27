import * as React from 'react';
import { CalendarClock, Clock, ExternalLink, Tv, Users } from 'lucide-react';
import type { ScheduleItem } from '@/types/contracts';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export interface UpcomingEpisodesListProps {
  items: readonly ScheduleItem[];
  delayMinutes?: number;
  title?: string;
  description?: string;
}

export function UpcomingEpisodesList({
  items,
  delayMinutes = 60,
  title = 'Próximos Episódios (48h)',
  description = 'Lançamentos estimados já considerando o tempo médio para sair legendado.',
}: UpcomingEpisodesListProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="w-fit gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />+{delayMinutes} min do
            Japão
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 px-4 text-center">
            <Tv className="h-9 w-9 text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium">
              Nenhum episódio previsto para as próximas 48 horas
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Assim que novos episódios entrarem na janela de exibição, eles
              aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-xl border bg-card/50">
            {items.map((item) => (
              <div
                key={item.airingEpisode.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {item.anime.coverUrl ? (
                    <img
                      src={item.anime.coverUrl}
                      alt={item.displayTitle}
                      className="h-16 w-12 rounded-md object-cover border shrink-0 bg-muted"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-16 w-12 items-center justify-center rounded-md border bg-muted text-muted-foreground shrink-0">
                      <Tv className="h-5 w-5" />
                    </div>
                  )}

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={item.anime.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sm sm:text-base hover:text-primary transition-colors inline-flex items-center gap-1 truncate max-w-full"
                      >
                        <span className="truncate">{item.displayTitle}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      </a>
                      <Badge variant="default" className="text-xs">
                        Ep. {item.episode}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {item.formattedDayHeader} às{' '}
                        <strong className="text-foreground font-medium">
                          {item.formattedTime}
                        </strong>
                      </span>
                    </div>

                    {item.watchers.some((w) => w.user.active) && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {item.watchers
                          .filter((w) => w.user.active)
                          .map((watcher) => (
                            <Badge
                              key={watcher.entryId}
                              variant="secondary"
                              className="text-[11px] font-normal"
                            >
                              {watcher.user.username
                                ? `@${watcher.user.username}`
                                : watcher.user.name}{' '}
                              (ep {watcher.progress})
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
