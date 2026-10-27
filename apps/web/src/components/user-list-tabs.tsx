'use client';

import * as React from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Minus,
  Pencil,
  Play,
  Plus,
  Trash2,
  Tv,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAnimeDisplayTitle,
  type GroupedUserList,
  type ListEntryWithAnime,
  type ListStatus,
} from '@/types/contracts';
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
import { cn } from '@/lib/utils';

export interface UserListTabsProps {
  userList: GroupedUserList;
  onSetProgress?: (
    entryId: string,
    episode: number,
  ) => Promise<void> | void;
  onSetStatus?: (
    entryId: string,
    status: ListStatus,
  ) => Promise<void> | void;
  onRemoveEntry?: (entryId: string) => Promise<void> | void;
}

interface StatusTabMeta {
  key: ListStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_TABS: readonly StatusTabMeta[] = [
  { key: 'ASSISTINDO', label: 'Assistindo', icon: Play },
  { key: 'QUERO_VER', label: 'Quero ver', icon: Clock },
  { key: 'COMPLETO', label: 'Completo', icon: CheckCircle2 },
];

export function UserListTabs({
  userList,
  onSetProgress,
  onSetStatus,
  onRemoveEntry,
}: UserListTabsProps): React.JSX.Element {
  const [activeTab, setActiveTab] = React.useState<ListStatus>('ASSISTINDO');
  const [editingEntryId, setEditingEntryId] = React.useState<string | null>(
    null,
  );
  const [episodeInput, setEpisodeInput] = React.useState<string>('0');
  const [confirmRemoveId, setConfirmRemoveId] = React.useState<string | null>(
    null,
  );
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const entriesForTab: readonly ListEntryWithAnime[] = userList[activeTab];

  async function handleQuickDelta(
    entry: ListEntryWithAnime,
    delta: number,
  ): Promise<void> {
    const maxEp = entry.anime.totalEpisodes;
    const nextEp = Math.max(
      0,
      maxEp != null
        ? Math.min(maxEp, entry.progress + delta)
        : entry.progress + delta,
    );
    if (nextEp === entry.progress) {
      return;
    }

    setBusyId(entry.id);
    try {
      await onSetProgress?.(entry.id, nextEp);
      toast.success(
        `Progresso de "${getAnimeDisplayTitle(entry.anime)}" atualizado para ep. ${nextEp}.`,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao atualizar progresso.';
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  async function handleInlineEpisodeSave(
    entry: ListEntryWithAnime,
  ): Promise<void> {
    const parsed = Number.parseInt(episodeInput, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error('Informe um número de episódio válido (>= 0).');
      return;
    }
    if (
      entry.anime.totalEpisodes != null &&
      parsed > entry.anime.totalEpisodes
    ) {
      toast.error(
        `Este anime possui no máximo ${entry.anime.totalEpisodes} episódios.`,
      );
      return;
    }

    setBusyId(entry.id);
    try {
      await onSetProgress?.(entry.id, parsed);
      setEditingEntryId(null);
      toast.success(
        `Episódio de "${getAnimeDisplayTitle(entry.anime)}" definido para ${parsed}.`,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao salvar episódio.';
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  async function handleStatusChange(
    entry: ListEntryWithAnime,
    newStatus: ListStatus,
  ): Promise<void> {
    if (entry.status === newStatus) {
      return;
    }
    setBusyId(entry.id);
    try {
      await onSetStatus?.(entry.id, newStatus);
      toast.success(
        `Status de "${getAnimeDisplayTitle(entry.anime)}" alterado.`,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao alterar status.';
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(entry: ListEntryWithAnime): Promise<void> {
    setBusyId(entry.id);
    try {
      await onRemoveEntry?.(entry.id);
      setConfirmRemoveId(null);
      toast.success(
        `"${getAnimeDisplayTitle(entry.anime)}" removido da lista.`,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao remover anime.';
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              Lista de {userList.user.name}
              {userList.user.username ? ` (@${userList.user.username})` : ''}
            </CardTitle>
            <CardDescription>
              Total de {userList.totalCount}{' '}
              {userList.totalCount === 1 ? 'anime na lista' : 'animes na lista'}
              . Edite o progresso ou mude o status diretamente.
            </CardDescription>
          </div>

          <div
            role="tablist"
            aria-label="Filtrar por status da lista"
            className="inline-flex rounded-lg border bg-muted/60 p-1 gap-1 self-start"
          >
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const count = userList[tab.key].length;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  <Badge
                    variant={isActive ? 'default' : 'secondary'}
                    className="ml-0.5 px-1.5 py-0 text-[10px]"
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {entriesForTab.length === 0 ? (
          <div className="rounded-xl border border-dashed py-10 px-4 text-center">
            <Tv className="h-9 w-9 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-sm font-medium">
              Nenhum anime nesta aba ({STATUS_TABS.find((t) => t.key === activeTab)?.label})
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Use a busca da AniList para adicionar títulos ou altere a aba
              acima.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-xl border">
            {entriesForTab.map((entry) => {
              const title = getAnimeDisplayTitle(entry.anime);
              const isEditingEp = editingEntryId === entry.id;
              const isConfirmingRemove = confirmRemoveId === entry.id;
              const isBusy = busyId === entry.id;

              return (
                <div
                  key={entry.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/30"
                >
                  {/* Info do Anime */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    {entry.anime.coverUrl ? (
                      <img
                        src={entry.anime.coverUrl}
                        alt={title}
                        className="h-20 w-14 rounded-md object-cover border shrink-0 bg-muted"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-20 w-14 items-center justify-center rounded-md border bg-muted text-muted-foreground shrink-0">
                        <Tv className="h-5 w-5" />
                      </div>
                    )}

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={entry.anime.siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-sm sm:text-base hover:text-primary transition-colors inline-flex items-center gap-1"
                        >
                          <span>{title}</span>
                          <ExternalLink className="h-3.5 w-3.5 opacity-60 shrink-0" />
                        </a>
                        {entry.anime.format && (
                          <Badge variant="outline" className="text-[11px]">
                            {entry.anime.format}
                          </Badge>
                        )}
                      </div>

                      {entry.anime.titleEnglish &&
                        entry.anime.titleRomaji !== entry.anime.titleEnglish && (
                          <p className="text-xs text-muted-foreground truncate">
                            {entry.anime.titleRomaji}
                          </p>
                        )}

                      {entry.anime.nextEpisode && (
                        <p className="text-xs text-primary font-medium">
                          Próximo: Ep. {entry.anime.nextEpisode.episode}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Controles de Progresso, Status e Remoção */}
                  <div className="flex flex-wrap items-center gap-3 justify-between lg:justify-end">
                    {/* Progresso Inline */}
                    <div className="flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5">
                      {isEditingEp ? (
                        <>
                          <Input
                            type="number"
                            min={0}
                            max={entry.anime.totalEpisodes ?? undefined}
                            value={episodeInput}
                            onChange={(e) => setEpisodeInput(e.target.value)}
                            className="h-7 w-16 px-2 text-center text-xs"
                            aria-label="Número do episódio"
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => void handleInlineEpisodeSave(entry)}
                            disabled={isBusy}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => setEditingEntryId(null)}
                            disabled={isBusy}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => void handleQuickDelta(entry, -1)}
                            disabled={isBusy || entry.progress <= 0}
                            title="Diminuir 1 episódio"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingEntryId(entry.id);
                              setEpisodeInput(String(entry.progress));
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-semibold hover:text-primary transition-colors"
                            title="Clique para definir o episódio manualmente"
                          >
                            <span>
                              Ep. {entry.progress} /{' '}
                              {entry.anime.totalEpisodes ?? '?'}
                            </span>
                            <Pencil className="h-3 w-3 opacity-60" />
                          </button>

                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2.5 text-xs font-semibold"
                            onClick={() => void handleQuickDelta(entry, 1)}
                            disabled={
                              isBusy ||
                              (entry.anime.totalEpisodes != null &&
                                entry.progress >= entry.anime.totalEpisodes)
                            }
                            title="Incrementar +1 episódio"
                          >
                            <Plus className="h-3.5 w-3.5" />1 ep
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Mudança rápida de status */}
                    <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 gap-0.5">
                      {STATUS_TABS.map((tab) => {
                        const isCurrent = entry.status === tab.key;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              void handleStatusChange(entry, tab.key)
                            }
                            className={cn(
                              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                              isCurrent
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Remover */}
                    {isConfirmingRemove ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="h-8 text-xs"
                          onClick={() => void handleRemove(entry)}
                          disabled={isBusy}
                        >
                          Confirmar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => setConfirmRemoveId(null)}
                          disabled={isBusy}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmRemoveId(entry.id)}
                        title="Remover da lista"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
