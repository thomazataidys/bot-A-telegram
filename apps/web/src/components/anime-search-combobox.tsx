'use client';

import * as React from 'react';
import { ExternalLink, Loader2, Plus, Search, Tv } from 'lucide-react';
import { toast } from 'sonner';
import type { AniListMedia, ListStatus } from '@/types/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export interface AnimeSearchComboboxProps {
  onSearch: (query: string) => Promise<AniListMedia[]>;
  onSelect: (
    media: AniListMedia,
    status: ListStatus,
  ) => Promise<void> | void;
  placeholder?: string;
}

export function AnimeSearchCombobox({
  onSearch,
  onSelect,
  placeholder = 'Digite o nome do anime para buscar na AniList (ex.: Solo Leveling)...',
}: AnimeSearchComboboxProps): React.JSX.Element {
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<ListStatus>('ASSISTINDO');
  const [results, setResults] = React.useState<AniListMedia[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [addingId, setAddingId] = React.useState<number | null>(null);
  const [hasSearched, setHasSearched] = React.useState(false);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const items = await onSearch(trimmed);
        if (!cancelled) {
          setResults(items);
          setHasSearched(true);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Erro ao buscar animes na AniList.';
          toast.error(msg);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, onSearch]);

  async function handleSelect(media: AniListMedia): Promise<void> {
    const displayTitle = media.title.english ?? media.title.romaji;
    setAddingId(media.id);
    try {
      await onSelect(media, status);
      toast.success(`"${displayTitle}" adicionado à lista!`);
      setQuery('');
      setResults([]);
      setHasSearched(false);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao adicionar anime.';
      toast.error(msg);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Adicionar Anime (Busca na AniList)
        </CardTitle>
        <CardDescription>
          Pesquise pelo título em inglês ou romaji e escolha o status inicial na
          lista.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="pl-9 pr-9"
              aria-label="Buscar anime na AniList"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary" />
            )}
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ListStatus)}
            aria-label="Status inicial do anime"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="ASSISTINDO">Assistindo</option>
            <option value="QUERO_VER">Quero ver</option>
            <option value="COMPLETO">Completo</option>
          </select>
        </div>

        {hasSearched && results.length === 0 && !isSearching && (
          <div className="rounded-lg border border-dashed py-6 px-4 text-center text-xs text-muted-foreground">
            Nenhum resultado encontrado na AniList para &ldquo;{query.trim()}
            &rdquo;.
          </div>
        )}

        {results.length > 0 && (
          <div
            role="listbox"
            aria-label="Resultados da busca na AniList"
            className="divide-y rounded-xl border bg-background shadow-sm max-h-80 overflow-y-auto"
          >
            {results.map((media) => {
              const title = media.title.english ?? media.title.romaji;
              const isAdding = addingId === media.id;

              return (
                <div
                  key={media.id}
                  role="option"
                  aria-selected={false}
                  className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {media.coverImage.large ? (
                      <img
                        src={media.coverImage.large}
                        alt={title}
                        className="h-14 w-10 rounded object-cover border shrink-0 bg-muted"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-14 w-10 items-center justify-center rounded border bg-muted text-muted-foreground shrink-0">
                        <Tv className="h-4 w-4" />
                      </div>
                    )}

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm truncate">
                          {title}
                        </span>
                        {media.format && (
                          <Badge variant="outline" className="text-[10px]">
                            {media.format}
                          </Badge>
                        )}
                      </div>

                      {media.title.english &&
                        media.title.romaji !== media.title.english && (
                          <p className="text-xs text-muted-foreground truncate">
                            {media.title.romaji}
                          </p>
                        )}

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>
                          {media.episodes != null
                            ? `${media.episodes} episódios`
                            : 'Episódios em aberto'}
                        </span>
                        {media.nextAiringEpisode && (
                          <span>
                            · Próx: Ep. {media.nextAiringEpisode.episode}
                          </span>
                        )}
                        <a
                          href={media.siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-primary hover:underline"
                        >
                          AniList
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSelect(media)}
                    disabled={isAdding}
                    className="shrink-0"
                  >
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Adicionar
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
