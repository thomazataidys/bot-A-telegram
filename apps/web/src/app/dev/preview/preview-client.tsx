'use client';

import * as React from 'react';
import {
  Bell,
  CalendarClock,
  RefreshCw,
  Sparkles,
  Tv,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  AniListMedia,
  AppSettings,
  CreatePanelUserInput,
  GlobalAnimeItem,
  GroupedUserList,
  ListEntryWithAnime,
  ListStatus,
  ScheduleResult,
  SyncResult,
  UpdateUserInput,
  UserWithStats,
} from '@/types/contracts';
import { AnimeGrid } from '@/components/anime-grid';
import { AnimeSearchCombobox } from '@/components/anime-search-combobox';
import { SettingsForm } from '@/components/settings-form';
import { StatCard } from '@/components/stat-card';
import { UpcomingEpisodesList } from '@/components/upcoming-episodes-list';
import { UserListTabs } from '@/components/user-list-tabs';
import { UsersTable } from '@/components/users-table';
import { WeekCalendar } from '@/components/week-calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const INITIAL_USERS: UserWithStats[] = [
  {
    id: 'user-thomaz',
    telegramId: '100200300',
    username: 'thomaz',
    name: 'Thomaz',
    active: true,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-26T12:00:00.000Z',
    entriesCount: 4,
    registrationState: 'ACTIVE',
  },
  {
    id: 'user-luiz',
    telegramId: '100200301',
    username: 'luiz',
    name: 'Luiz',
    active: true,
    createdAt: '2026-10-02T15:30:00.000Z',
    updatedAt: '2026-10-26T14:00:00.000Z',
    entriesCount: 3,
    registrationState: 'ACTIVE',
  },
  {
    id: 'user-marina',
    telegramId: null,
    username: 'marina_otaku',
    name: 'Marina',
    active: true,
    createdAt: '2026-10-20T18:00:00.000Z',
    updatedAt: '2026-10-20T18:00:00.000Z',
    entriesCount: 0,
    registrationState: 'NEVER_STARTED_BOT',
  },
  {
    id: 'user-carlos',
    telegramId: '100200309',
    username: 'carlos_dev',
    name: 'Carlos',
    active: false,
    createdAt: '2026-10-25T20:00:00.000Z',
    updatedAt: '2026-10-25T20:00:00.000Z',
    entriesCount: 0,
    registrationState: 'PENDING_APPROVAL',
  },
];

const MOCK_ANILIST_CATALOG: AniListMedia[] = [
  {
    id: 176496,
    idMal: 58567,
    title: {
      romaji: 'Ore dake Level Up na Ken Season 2: Arise from the Shadow',
      english: 'Solo Leveling Season 2 -Arise from the Shadow-',
    },
    coverImage: {
      large: null,
    },
    siteUrl: 'https://anilist.co/anime/176496',
    format: 'TV',
    status: 'RELEASING',
    episodes: 13,
    nextAiringEpisode: {
      episode: 6,
      airingAt: 1761669000,
    },
  },
  {
    id: 171018,
    idMal: 57334,
    title: {
      romaji: 'Dandadan',
      english: 'DAN DA DAN',
    },
    coverImage: {
      large: null,
    },
    siteUrl: 'https://anilist.co/anime/171018',
    format: 'TV',
    status: 'RELEASING',
    episodes: 12,
    nextAiringEpisode: {
      episode: 8,
      airingAt: 1761840000,
    },
  },
  {
    id: 154587,
    idMal: 52991,
    title: {
      romaji: 'Sousou no Frieren',
      english: "Frieren: Beyond Journey's End",
    },
    coverImage: {
      large: null,
    },
    siteUrl: 'https://anilist.co/anime/154587',
    format: 'TV',
    status: 'FINISHED',
    episodes: 28,
    nextAiringEpisode: null,
  },
];

const INITIAL_USER_ENTRIES: ListEntryWithAnime[] = [
  {
    id: 'entry-1',
    userId: 'user-thomaz',
    animeId: 'anime-solo-2',
    status: 'ASSISTINDO',
    progress: 5,
    addedAt: '2026-10-05T10:00:00.000Z',
    updatedAt: '2026-10-25T21:00:00.000Z',
    anime: {
      id: 'anime-solo-2',
      anilistId: 176496,
      malId: 58567,
      titleEnglish: 'Solo Leveling Season 2 -Arise from the Shadow-',
      titleRomaji: 'Ore dake Level Up na Ken Season 2',
      coverUrl: null,
      siteUrl: 'https://anilist.co/anime/176496',
      format: 'TV',
      status: 'RELEASING',
      totalEpisodes: 13,
      lastSyncedAt: '2026-10-26T20:30:00.000Z',
      nextEpisode: {
        id: 'ep-solo-6',
        animeId: 'anime-solo-2',
        episode: 6,
        airingAt: '2026-10-27T15:30:00.000Z',
        notifiedAt: null,
      },
    },
  },
  {
    id: 'entry-2',
    userId: 'user-thomaz',
    animeId: 'anime-dandadan',
    status: 'ASSISTINDO',
    progress: 7,
    addedAt: '2026-10-06T12:00:00.000Z',
    updatedAt: '2026-10-24T22:00:00.000Z',
    anime: {
      id: 'anime-dandadan',
      anilistId: 171018,
      malId: 57334,
      titleEnglish: 'DAN DA DAN',
      titleRomaji: 'Dandadan',
      coverUrl: null,
      siteUrl: 'https://anilist.co/anime/171018',
      format: 'TV',
      status: 'RELEASING',
      totalEpisodes: 12,
      lastSyncedAt: '2026-10-26T20:30:00.000Z',
      nextEpisode: {
        id: 'ep-ddd-8',
        animeId: 'anime-dandadan',
        episode: 8,
        airingAt: '2026-10-29T13:00:00.000Z',
        notifiedAt: null,
      },
    },
  },
  {
    id: 'entry-3',
    userId: 'user-thomaz',
    animeId: 'anime-rezero-3',
    status: 'QUERO_VER',
    progress: 0,
    addedAt: '2026-10-10T10:00:00.000Z',
    updatedAt: '2026-10-10T10:00:00.000Z',
    anime: {
      id: 'anime-rezero-3',
      anilistId: 163134,
      malId: 54857,
      titleEnglish: 'Re:ZERO -Starting Life in Another World- Season 3',
      titleRomaji: 'Re:Zero kara Hajimeru Isekai Seikatsu 3rd Season',
      coverUrl: null,
      siteUrl: 'https://anilist.co/anime/163134',
      format: 'TV',
      status: 'RELEASING',
      totalEpisodes: 16,
      lastSyncedAt: '2026-10-26T20:30:00.000Z',
      nextEpisode: {
        id: 'ep-rz-5',
        animeId: 'anime-rezero-3',
        episode: 5,
        airingAt: '2026-10-28T14:30:00.000Z',
        notifiedAt: null,
      },
    },
  },
  {
    id: 'entry-4',
    userId: 'user-thomaz',
    animeId: 'anime-frieren',
    status: 'COMPLETO',
    progress: 28,
    addedAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-28T10:00:00.000Z',
    anime: {
      id: 'anime-frieren',
      anilistId: 154587,
      malId: 52991,
      titleEnglish: "Frieren: Beyond Journey's End",
      titleRomaji: 'Sousou no Frieren',
      coverUrl: null,
      siteUrl: 'https://anilist.co/anime/154587',
      format: 'TV',
      status: 'FINISHED',
      totalEpisodes: 28,
      lastSyncedAt: '2026-10-26T20:30:00.000Z',
      nextEpisode: null,
    },
  },
];

const MOCK_GLOBAL_ITEMS: GlobalAnimeItem[] = [
  {
    anime: INITIAL_USER_ENTRIES[0]!.anime,
    displayTitle: 'Solo Leveling Season 2 -Arise from the Shadow-',
    nextEpisode: INITIAL_USER_ENTRIES[0]!.anime.nextEpisode,
    watchers: [
      {
        user: {
          id: 'user-thomaz',
          name: 'Thomaz',
          username: 'thomaz',
          telegramId: '100200300',
          active: true,
        },
        entryId: 'entry-1',
        status: 'ASSISTINDO',
        progress: 5,
      },
      {
        user: {
          id: 'user-luiz',
          name: 'Luiz',
          username: 'luiz',
          telegramId: '100200301',
          active: true,
        },
        entryId: 'entry-luiz-1',
        status: 'ASSISTINDO',
        progress: 3,
      },
    ],
  },
  {
    anime: INITIAL_USER_ENTRIES[1]!.anime,
    displayTitle: 'DAN DA DAN',
    nextEpisode: INITIAL_USER_ENTRIES[1]!.anime.nextEpisode,
    watchers: [
      {
        user: {
          id: 'user-thomaz',
          name: 'Thomaz',
          username: 'thomaz',
          telegramId: '100200300',
          active: true,
        },
        entryId: 'entry-2',
        status: 'ASSISTINDO',
        progress: 7,
      },
      {
        user: {
          id: 'user-luiz',
          name: 'Luiz',
          username: 'luiz',
          telegramId: '100200301',
          active: true,
        },
        entryId: 'entry-luiz-2',
        status: 'QUERO_VER',
        progress: 0,
      },
    ],
  },
  {
    anime: INITIAL_USER_ENTRIES[2]!.anime,
    displayTitle: 'Re:ZERO -Starting Life in Another World- Season 3',
    nextEpisode: INITIAL_USER_ENTRIES[2]!.anime.nextEpisode,
    watchers: [
      {
        user: {
          id: 'user-thomaz',
          name: 'Thomaz',
          username: 'thomaz',
          telegramId: '100200300',
          active: true,
        },
        entryId: 'entry-3',
        status: 'QUERO_VER',
        progress: 0,
      },
    ],
  },
  {
    anime: INITIAL_USER_ENTRIES[3]!.anime,
    displayTitle: "Frieren: Beyond Journey's End",
    nextEpisode: null,
    watchers: [
      {
        user: {
          id: 'user-thomaz',
          name: 'Thomaz',
          username: 'thomaz',
          telegramId: '100200300',
          active: true,
        },
        entryId: 'entry-4',
        status: 'COMPLETO',
        progress: 28,
      },
      {
        user: {
          id: 'user-luiz',
          name: 'Luiz',
          username: 'luiz',
          telegramId: '100200301',
          active: true,
        },
        entryId: 'entry-luiz-3',
        status: 'COMPLETO',
        progress: 28,
      },
    ],
  },
];

const MOCK_CURRENT_WEEK: ScheduleResult = {
  weekRange: {
    offsetWeeks: 0,
    timezone: 'America/Fortaleza',
    startUtc: '2026-10-26T03:00:00.000Z',
    endUtc: '2026-11-02T02:59:59.999Z',
    periodLabel: '26/10 – 01/11',
  },
  delayMinutes: 60,
  timezone: 'America/Fortaleza',
  days: [
    {
      dayKey: '2026-10-27',
      dayHeader: 'Terça, 27/10',
      items: [
        {
          airingEpisode: {
            id: 'ep-solo-6',
            animeId: 'anime-solo-2',
            episode: 6,
            airingAt: '2026-10-27T15:30:00.000Z',
            notifiedAt: null,
          },
          anime: INITIAL_USER_ENTRIES[0]!.anime,
          displayTitle: 'Solo Leveling Season 2 -Arise from the Shadow-',
          episode: 6,
          japanAiringAt: '2026-10-27T15:30:00.000Z',
          subbedAiringAt: '2026-10-27T16:30:00.000Z',
          formattedTime: '13:30',
          formattedDayHeader: 'Terça, 27/10',
          dayKey: '2026-10-27',
          watchers: MOCK_GLOBAL_ITEMS[0]!.watchers,
        },
      ],
    },
    {
      dayKey: '2026-10-28',
      dayHeader: 'Quarta, 28/10',
      items: [
        {
          airingEpisode: {
            id: 'ep-rz-5',
            animeId: 'anime-rezero-3',
            episode: 5,
            airingAt: '2026-10-28T13:30:00.000Z',
            notifiedAt: null,
          },
          anime: INITIAL_USER_ENTRIES[2]!.anime,
          displayTitle: 'Re:ZERO -Starting Life in Another World- Season 3',
          episode: 5,
          japanAiringAt: '2026-10-28T13:30:00.000Z',
          subbedAiringAt: '2026-10-28T14:30:00.000Z',
          formattedTime: '11:30',
          formattedDayHeader: 'Quarta, 28/10',
          dayKey: '2026-10-28',
          watchers: MOCK_GLOBAL_ITEMS[2]!.watchers,
        },
      ],
    },
    {
      dayKey: '2026-10-29',
      dayHeader: 'Quinta, 29/10',
      items: [
        {
          airingEpisode: {
            id: 'ep-ddd-8',
            animeId: 'anime-dandadan',
            episode: 8,
            airingAt: '2026-10-29T15:00:00.000Z',
            notifiedAt: null,
          },
          anime: INITIAL_USER_ENTRIES[1]!.anime,
          displayTitle: 'DAN DA DAN',
          episode: 8,
          japanAiringAt: '2026-10-29T15:00:00.000Z',
          subbedAiringAt: '2026-10-29T16:00:00.000Z',
          formattedTime: '13:00',
          formattedDayHeader: 'Quinta, 29/10',
          dayKey: '2026-10-29',
          watchers: MOCK_GLOBAL_ITEMS[1]!.watchers,
        },
      ],
    },
  ],
  items: [],
};

const MOCK_NEXT_WEEK: ScheduleResult = {
  weekRange: {
    offsetWeeks: 1,
    timezone: 'America/Fortaleza',
    startUtc: '2026-11-02T03:00:00.000Z',
    endUtc: '2026-11-09T02:59:59.999Z',
    periodLabel: '02/11 – 08/11',
  },
  delayMinutes: 60,
  timezone: 'America/Fortaleza',
  days: [
    {
      dayKey: '2026-11-03',
      dayHeader: 'Terça, 03/11',
      items: [
        {
          airingEpisode: {
            id: 'ep-solo-7',
            animeId: 'anime-solo-2',
            episode: 7,
            airingAt: '2026-11-03T15:30:00.000Z',
            notifiedAt: null,
          },
          anime: INITIAL_USER_ENTRIES[0]!.anime,
          displayTitle: 'Solo Leveling Season 2 -Arise from the Shadow-',
          episode: 7,
          japanAiringAt: '2026-11-03T15:30:00.000Z',
          subbedAiringAt: '2026-11-03T16:30:00.000Z',
          formattedTime: '13:30',
          formattedDayHeader: 'Terça, 03/11',
          dayKey: '2026-11-03',
          watchers: MOCK_GLOBAL_ITEMS[0]!.watchers,
        },
      ],
    },
  ],
  items: [],
};

const INITIAL_SETTINGS: AppSettings = {
  groupChatId: '-1001928374650',
  notificationDelayMinutes: 60,
  syncIntervalMinutes: 30,
  timezone: 'America/Fortaleza',
  autoApproveUsers: true,
};

export function PreviewClient(): React.JSX.Element {
  const [users, setUsers] = React.useState<UserWithStats[]>(INITIAL_USERS);
  const [entries, setEntries] = React.useState<ListEntryWithAnime[]>(
    INITIAL_USER_ENTRIES,
  );
  const [settings, setSettings] = React.useState<AppSettings>(INITIAL_SETTINGS);

  const groupedUserList: GroupedUserList = React.useMemo(
    () => ({
      user: users[0] ?? INITIAL_USERS[0]!,
      ASSISTINDO: entries.filter((e) => e.status === 'ASSISTINDO'),
      QUERO_VER: entries.filter((e) => e.status === 'QUERO_VER'),
      COMPLETO: entries.filter((e) => e.status === 'COMPLETO'),
      totalCount: entries.length,
    }),
    [entries, users],
  );

  const upcomingItems = React.useMemo(
    () => MOCK_CURRENT_WEEK.days.flatMap((d) => d.items),
    [],
  );

  function handleCreateUser(input: CreatePanelUserInput): void {
    const newUser: UserWithStats = {
      id: `user-${Date.now()}`,
      telegramId: null,
      username: input.username ?? null,
      name: input.name,
      active: input.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entriesCount: 0,
      registrationState: 'NEVER_STARTED_BOT',
    };
    setUsers((prev) => [...prev, newUser]);
  }

  function handleUpdateUser(userId: string, input: UpdateUserInput): void {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              name: input.name ?? u.name,
              username:
                input.username !== undefined ? input.username : u.username,
            }
          : u,
      ),
    );
  }

  function handleToggleActive(userId: string, active: boolean): void {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              active,
              registrationState: !active
                ? 'PENDING_APPROVAL'
                : u.telegramId
                  ? 'ACTIVE'
                  : 'NEVER_STARTED_BOT',
            }
          : u,
      ),
    );
  }

  function handleDeleteUser(userId: string): void {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  function handleSetProgress(entryId: string, episode: number): void {
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, progress: episode } : e)),
    );
  }

  function handleSetStatus(entryId: string, status: ListStatus): void {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              status,
              progress:
                status === 'COMPLETO' && e.anime.totalEpisodes != null
                  ? e.anime.totalEpisodes
                  : e.progress,
            }
          : e,
      ),
    );
  }

  function handleRemoveEntry(entryId: string): void {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }

  async function handleSearchAniList(query: string): Promise<AniListMedia[]> {
    const q = query.toLowerCase();
    const filtered = MOCK_ANILIST_CATALOG.filter(
      (item) =>
        item.title.romaji.toLowerCase().includes(q) ||
        (item.title.english?.toLowerCase().includes(q) ?? false),
    );
    return filtered.length > 0 ? filtered : MOCK_ANILIST_CATALOG;
  }

  function handleSelectAnime(media: AniListMedia, status: ListStatus): void {
    const newEntry: ListEntryWithAnime = {
      id: `entry-${Date.now()}`,
      userId: 'user-thomaz',
      animeId: `anime-${media.id}`,
      status,
      progress:
        status === 'COMPLETO' && media.episodes != null ? media.episodes : 0,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      anime: {
        id: `anime-${media.id}`,
        anilistId: media.id,
        malId: media.idMal,
        titleEnglish: media.title.english,
        titleRomaji: media.title.romaji,
        coverUrl: media.coverImage.large,
        siteUrl: media.siteUrl,
        format: media.format,
        status: media.status,
        totalEpisodes: media.episodes,
        lastSyncedAt: new Date().toISOString(),
        nextEpisode: media.nextAiringEpisode
          ? {
              id: `ep-${media.id}-${media.nextAiringEpisode.episode}`,
              animeId: `anime-${media.id}`,
              episode: media.nextAiringEpisode.episode,
              airingAt: new Date(
                media.nextAiringEpisode.airingAt * 1000,
              ).toISOString(),
              notifiedAt: null,
            }
          : null,
      },
    };
    setEntries((prev) => [newEntry, ...prev]);
  }

  async function handleSyncNow(): Promise<SyncResult> {
    return {
      syncedAnimesCount: 4,
      upsertedEpisodesCount: 12,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    };
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Cabeçalho do Preview */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border bg-gradient-to-r from-primary/10 via-background to-background p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Catálogo Visual — Etapa 2
            </Badge>
            <Badge variant="outline">Dados Fictícios</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Preview dos Componentes do Painel
          </h1>
          <p className="text-sm text-muted-foreground">
            Todos os componentes abaixo são puramente visuais, tipados conforme
            docs/CONTRATOS.md e interativos em memória.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            toast.info('Notificação de exemplo disparada via Sonner!')
          }
        >
          <Bell className="h-4 w-4" />
          Testar Toast (Sonner)
        </Button>
      </div>

      {/* 1. StatCards + UpcomingEpisodesList */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">
            1. Dashboard (StatCard + UpcomingEpisodesList)
          </h2>
          <p className="text-xs text-muted-foreground">
            Indicadores principais e episódios das próximas 48 horas.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Usuários Ativos"
            value={`${users.filter((u) => u.active).length} / ${users.length}`}
            subtitle="Membros com acesso liberado no bot"
            badgeText="Online"
            icon={Users}
          />
          <StatCard
            title="Animes Monitorados"
            value={MOCK_GLOBAL_ITEMS.length}
            subtitle="Títulos únicos nas listas do grupo"
            badgeText="AniList"
            icon={Tv}
          />
          <StatCard
            title="Próximos 48h"
            value={upcomingItems.length}
            subtitle="Episódios saindo nos próximos 2 dias"
            badgeText="+1h JP"
            icon={CalendarClock}
          />
          <StatCard
            title="Última Sincronização"
            value="Há 12 min"
            subtitle="Último aviso enviado: hoje às 13:35"
            badgeText="Automático"
            icon={RefreshCw}
          />
        </div>

        <UpcomingEpisodesList
          items={upcomingItems}
          delayMinutes={settings.notificationDelayMinutes}
        />
      </section>

      <Separator />

      {/* 2. UsersTable */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">2. Tabela de Usuários (UsersTable)</h2>
          <p className="text-xs text-muted-foreground">
            Experimente cadastrar, editar inline, ativar/desativar ou excluir um
            usuário.
          </p>
        </div>

        <UsersTable
          users={users}
          onCreateUser={handleCreateUser}
          onUpdateUser={handleUpdateUser}
          onToggleActive={handleToggleActive}
          onDeleteUser={handleDeleteUser}
        />
      </section>

      <Separator />

      {/* 3. AnimeSearchCombobox + UserListTabs */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">
            3. Lista Individual + Busca na AniList (AnimeSearchCombobox &
            UserListTabs)
          </h2>
          <p className="text-xs text-muted-foreground">
            Digite &ldquo;Solo&rdquo;, &ldquo;Dan&rdquo; ou &ldquo;Frieren&rdquo;
            na busca para testar o autocomplete, ou edite o progresso inline nas
            abas.
          </p>
        </div>

        <AnimeSearchCombobox
          onSearch={handleSearchAniList}
          onSelect={handleSelectAnime}
        />

        <UserListTabs
          userList={groupedUserList}
          onSetProgress={handleSetProgress}
          onSetStatus={handleSetStatus}
          onRemoveEntry={handleRemoveEntry}
        />
      </section>

      <Separator />

      {/* 4. AnimeCard / AnimeGrid */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">
            4. Lista Global de Animes (AnimeCard & AnimeGrid)
          </h2>
          <p className="text-xs text-muted-foreground">
            Filtre por usuário, por status na lista ou busque pelo título.
          </p>
        </div>

        <AnimeGrid items={MOCK_GLOBAL_ITEMS} users={users} />
      </section>

      <Separator />

      {/* 5. WeekCalendar */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">
            5. Agenda Semanal (WeekCalendar)
          </h2>
          <p className="text-xs text-muted-foreground">
            Alterne entre &ldquo;Esta semana&rdquo; e &ldquo;Próxima
            semana&rdquo; ou filtre por usuário.
          </p>
        </div>

        <WeekCalendar
          currentWeek={MOCK_CURRENT_WEEK}
          nextWeek={MOCK_NEXT_WEEK}
          users={users}
        />
      </section>

      <Separator />

      {/* 6. SettingsForm */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">
            6. Configurações do Bot (SettingsForm)
          </h2>
          <p className="text-xs text-muted-foreground">
            Validação com Zod, botão de teste no grupo e sincronização imediata.
          </p>
        </div>

        <SettingsForm
          initialSettings={settings}
          onSaveSettings={(updated) => setSettings(updated)}
          onSendTestMessage={async () => {
            await new Promise((r) => setTimeout(r, 300));
          }}
          onSyncNow={handleSyncNow}
        />
      </section>
    </div>
  );
}
