'use client';

import * as React from 'react';
import { Filter, Search, Tv, X } from 'lucide-react';
import type {
  GlobalAnimeItem,
  ListStatus,
  UserWithStats,
} from '@/types/contracts';
import { AnimeCard } from '@/components/anime-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface AnimeGridProps {
  items: readonly GlobalAnimeItem[];
  users?: readonly UserWithStats[];
  initialUserId?: string;
  initialStatus?: ListStatus | 'ALL';
}

export function AnimeGrid({
  items,
  users = [],
  initialUserId = 'ALL',
  initialStatus = 'ALL',
}: AnimeGridProps): React.JSX.Element {
  const [selectedUserId, setSelectedUserId] =
    React.useState<string>(initialUserId);
  const [selectedStatus, setSelectedStatus] = React.useState<
    ListStatus | 'ALL'
  >(initialStatus);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredItems = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (query) {
        const matchesTitle =
          item.displayTitle.toLowerCase().includes(query) ||
          item.anime.titleRomaji.toLowerCase().includes(query) ||
          (item.anime.titleEnglish?.toLowerCase().includes(query) ?? false);
        if (!matchesTitle) {
          return false;
        }
      }

      if (selectedUserId !== 'ALL' || selectedStatus !== 'ALL') {
        const hasMatchingWatcher = item.watchers.some((w) => {
          const matchesUser =
            selectedUserId === 'ALL' || w.user.id === selectedUserId;
          const matchesStatus =
            selectedStatus === 'ALL' || w.status === selectedStatus;
          return matchesUser && matchesStatus;
        });
        if (!hasMatchingWatcher) {
          return false;
        }
      }

      return true;
    });
  }, [items, searchQuery, selectedUserId, selectedStatus]);

  const hasFilters =
    selectedUserId !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    searchQuery.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-col md:flex-row gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar anime por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Buscar anime por título"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Filtros:</span>
          </div>

          {users.length > 0 && (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              aria-label="Filtrar por usuário"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="ALL">Todos os usuários</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.username ? `(@${user.username})` : ''}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value as ListStatus | 'ALL')
            }
            aria-label="Filtrar por status da lista"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="ALL">Todos os status</option>
            <option value="ASSISTINDO">Assistindo</option>
            <option value="QUERO_VER">Quero ver</option>
            <option value="COMPLETO">Completo</option>
          </select>

          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedUserId('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Contagem e Grade */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 py-12 px-4 text-center">
          <Tv className="h-10 w-10 text-muted-foreground/60 mx-auto mb-2" />
          <p className="text-sm font-medium">
            Nenhum anime encontrado para os filtros selecionados
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Tente limpar os filtros ou buscar por outro termo.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredItems.map((item) => (
            <AnimeCard key={item.anime.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
