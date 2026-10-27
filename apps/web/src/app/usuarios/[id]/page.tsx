import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getUserById, getUserList, UserNotFoundError } from '@animebot/core';
import { UserDetailClient } from './user-detail-client';
import { Button } from '@/components/ui/button';
import { serializeGroupedUserList } from '@/lib/serialize';

export const metadata: Metadata = {
  title: 'Lista do Usuário',
};

export const dynamic = 'force-dynamic';

export default async function UsuarioDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;

  try {
    await getUserById(id);
    const rawList = await getUserList(id);
    const userList = serializeGroupedUserList(rawList);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/usuarios">
                <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para Usuários
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Lista de {userList.user.name}
              {userList.user.username ? ` (@${userList.user.username})` : ''}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione animes da AniList, edite o episódio assistido ou altere o
              status na lista.
            </p>
          </div>
        </div>

        <UserDetailClient userList={userList} />
      </div>
    );
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      notFound();
    }
    throw err;
  }
}
