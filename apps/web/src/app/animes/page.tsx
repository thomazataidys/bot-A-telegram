import * as React from 'react';
import type { Metadata } from 'next';
import { getGlobalList, listUsersWithStats } from '@animebot/core';
import type { GlobalListFilter, ListStatus } from '@/types/contracts';
import { AnimeGrid } from '@/components/anime-grid';
import {
  serializeGlobalAnimeItem,
  serializeUserWithStats,
} from '@/lib/serialize';

export const metadata: Metadata = {
  title: 'Animes',
};

export const dynamic = 'force-dynamic';

interface AnimesSearchParams {
  userId?: string;
  listStatus?: string;
  animeStatus?: string;
  search?: string;
}

function parseListStatus(raw: string | undefined): ListStatus | undefined {
  if (raw === 'ASSISTINDO' || raw === 'QUERO_VER' || raw === 'COMPLETO') {
    return raw;
  }
  return undefined;
}

export default async function AnimesPage({
  searchParams,
}: {
  searchParams: Promise<AnimesSearchParams>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const parsedStatus = parseListStatus(params.listStatus);

  const filter: GlobalListFilter = {
    ...(params.userId ? { userId: params.userId } : {}),
    ...(parsedStatus ? { listStatus: parsedStatus } : {}),
    ...(params.animeStatus ? { animeStatus: params.animeStatus } : {}),
    ...(params.search ? { search: params.search } : {}),
  };

  const [rawItems, rawUsers] = await Promise.all([
    getGlobalList(filter),
    listUsersWithStats(),
  ]);

  const items = rawItems
    .map(serializeGlobalAnimeItem)
    .filter((item) => item.watchers.length > 0);
  const users = rawUsers
    .filter((u) => u.active)
    .map(serializeUserWithStats);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Animes (Lista Global)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Todos os animes presentes nas listas do grupo, próximo episódio e o
          progresso de cada membro.
        </p>
      </div>

      <AnimeGrid
        items={items}
        users={users}
        initialUserId={params.userId ?? 'ALL'}
        initialStatus={parsedStatus ?? 'ALL'}
      />
    </div>
  );
}
