import * as React from 'react';
import type { Metadata } from 'next';
import { listUsersWithStats } from '@animebot/core';
import {
  createUserAction,
  deleteUserAction,
  toggleUserActiveAction,
  updateUserAction,
} from './actions';
import { UsersTable } from '@/components/users-table';
import { serializeUserWithStats } from '@/lib/serialize';

export const metadata: Metadata = {
  title: 'Usuários',
};

export const dynamic = 'force-dynamic';

export default async function UsuariosPage(): Promise<React.JSX.Element> {
  const rawUsers = await listUsersWithStats();
  const users = rawUsers.map(serializeUserWithStats);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Usuários
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre amigos pelo @username, aprove acessos pendentes e clique no
          nome de um membro para gerenciar sua lista de animes.
        </p>
      </div>

      <UsersTable
        users={users}
        onCreateUser={createUserAction}
        onUpdateUser={updateUserAction}
        onToggleActive={toggleUserActiveAction}
        onDeleteUser={deleteUserAction}
      />
    </div>
  );
}
