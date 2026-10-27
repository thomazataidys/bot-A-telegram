import * as React from 'react';
import { CalendarClock, ExternalLink, Tv, Users } from 'lucide-react';
import type { GlobalAnimeItem, ListStatus } from '@/types/contracts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export interface AnimeCardProps {
  item: GlobalAnimeItem;
}

function formatAnimeAiringStatus(status: string | null): {
  label: string;
  variant: 'default' | 'secondary' | 'outline';
} {
  switch (status) {
    case 'RELEASING':
      return { label: 'Em exibição', variant: 'default' };
    case 'FINISHED':
      return { label: 'Finalizado', variant: 'secondary' };
    case 'NOT_YET_RELEASED':
      return { label: 'Em breve', variant: 'outline' };
    case 'HIATUS':
      return { label: 'Em hiato', variant: 'outline' };
    case 'CANCELLED':
      return { label: 'Cancelado', variant: 'outline' };
    default:
      return { label: status ?? 'Desconhecido', variant: 'outline' };
  }
}

function formatWatcherStatusLabel(status: ListStatus): string {
  switch (status) {
    case 'ASSISTINDO':
      return 'Assistindo';
    case 'QUERO_VER':
      return 'Quero ver';
    case 'COMPLETO':
      return 'Completo';
  }
}

export function AnimeCard({ item }: AnimeCardProps): React.JSX.Element {
  const airingStatus = formatAnimeAiringStatus(item.anime.status);

  return (
    <Card className="overflow-hidden flex flex-col transition-all hover:shadow-md">
      <div className="flex gap-4 p-4 flex-1">
        {item.anime.coverUrl ? (
          <img
            src={item.anime.coverUrl}
            alt={item.displayTitle}
            className="h-32 w-22 rounded-lg object-cover border shrink-0 bg-muted"
            loading="lazy"
          />
        ) : (
          <div className="flex h-32 w-22 items-center justify-center rounded-lg border bg-muted text-muted-foreground shrink-0">
            <Tv className="h-7 w-7" />
          </div>
        )}

        <div className="flex flex-col justify-between min-w-0 flex-1 space-y-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={airingStatus.variant} className="text-[10px]">
                {airingStatus.label}
              </Badge>
              {item.anime.format && (
                <Badge variant="outline" className="text-[10px]">
                  {item.anime.format}
                </Badge>
              )}
              {item.anime.totalEpisodes != null && (
                <span className="text-xs text-muted-foreground">
                  {item.anime.totalEpisodes} eps
                </span>
              )}
            </div>

            <a
              href={item.anime.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-base leading-snug hover:text-primary transition-colors inline-flex items-start gap-1 line-clamp-2"
            >
              <span>{item.displayTitle}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-1 opacity-60" />
            </a>

            {item.anime.titleEnglish &&
              item.anime.titleRomaji !== item.anime.titleEnglish && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {item.anime.titleRomaji}
                </p>
              )}
          </div>

          {item.nextEpisode ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 rounded-md px-2.5 py-1 w-fit">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              <span>Próximo: Episódio {item.nextEpisode.episode}</span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Sem próximo episódio agendado
            </div>
          )}
        </div>
      </div>

      <CardContent className="border-t bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground">
            Quem acompanha ({item.watchers.length})
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {item.watchers.map((watcher) => (
            <Badge
              key={watcher.entryId}
              variant="secondary"
              className="text-xs font-normal gap-1 py-0.5"
              title={formatWatcherStatusLabel(watcher.status)}
            >
              <span className="font-medium">
                {watcher.user.username
                  ? `@${watcher.user.username}`
                  : watcher.user.name}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="font-mono text-[11px]">
                ep {watcher.progress}
                {item.anime.totalEpisodes
                  ? `/${item.anime.totalEpisodes}`
                  : ''}
              </span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
