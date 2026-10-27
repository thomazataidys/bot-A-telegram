'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Check,
  Clock,
  ExternalLink,
  Pencil,
  Plus,
  Power,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  CreatePanelUserInput,
  UpdateUserInput,
  UserRegistrationState,
  UserWithStats,
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
import { Label } from '@/components/ui/label';

export interface UsersTableProps {
  users: readonly UserWithStats[];
  onCreateUser?: (input: CreatePanelUserInput) => Promise<void> | void;
  onUpdateUser?: (
    userId: string,
    input: UpdateUserInput,
  ) => Promise<void> | void;
  onToggleActive?: (userId: string, active: boolean) => Promise<void> | void;
  onDeleteUser?: (userId: string) => Promise<void> | void;
}

function renderRegistrationBadge(
  state: UserRegistrationState,
): React.JSX.Element {
  switch (state) {
    case 'ACTIVE':
      return (
        <Badge
          variant="default"
          className="bg-emerald-600 hover:bg-emerald-600/90 text-white gap-1"
        >
          <UserCheck className="h-3 w-3" />
          Ativo
        </Badge>
      );
    case 'PENDING_APPROVAL':
      return (
        <Badge
          variant="secondary"
          className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1"
        >
          <Clock className="h-3 w-3" />
          Aguardando aprovação
        </Badge>
      );
    case 'NEVER_STARTED_BOT':
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          Ainda não falou com o bot
        </Badge>
      );
  }
}

export function UsersTable({
  users,
  onCreateUser,
  onUpdateUser,
  onToggleActive,
  onDeleteUser,
}: UsersTableProps): React.JSX.Element {
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newUsername, setNewUsername] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editUsername, setEditUsername] = React.useState('');

  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(
    null,
  );

  async function handleCreateSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName) {
      toast.error('Informe o nome do usuário.');
      return;
    }

    const cleanUsername = newUsername.trim().replace(/^@+/, '').toLowerCase();

    setIsSubmitting(true);
    try {
      await onCreateUser?.({
        name: trimmedName,
        username: cleanUsername || null,
        active: true,
      });
      setNewName('');
      setNewUsername('');
      setShowCreateForm(false);
      toast.success(`Usuário "${trimmedName}" cadastrado com sucesso!`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao cadastrar usuário.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditing(user: UserWithStats): void {
    setEditingId(user.id);
    setEditName(user.name);
    setEditUsername(user.username ?? '');
    setConfirmDeleteId(null);
  }

  async function saveEdit(userId: string): Promise<void> {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      toast.error('O nome não pode ficar vazio.');
      return;
    }
    const cleanUsername = editUsername.trim().replace(/^@+/, '').toLowerCase();

    setIsSubmitting(true);
    try {
      await onUpdateUser?.(userId, {
        name: trimmedName,
        username: cleanUsername || null,
      });
      setEditingId(null);
      toast.success('Dados do usuário atualizados.');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao atualizar usuário.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(user: UserWithStats): Promise<void> {
    const nextActive = !user.active;
    setIsSubmitting(true);
    try {
      await onToggleActive?.(user.id, nextActive);
      toast.success(
        nextActive
          ? `Usuário "${user.name}" ativado.`
          : `Usuário "${user.name}" desativado.`,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao alterar status.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(user: UserWithStats): Promise<void> {
    setIsSubmitting(true);
    try {
      await onDeleteUser?.(user.id);
      setConfirmDeleteId(null);
      toast.success(`Usuário "${user.name}" removido.`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao remover usuário.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Usuários do Grupo</CardTitle>
              <CardDescription>
                Cadastre amigos pelo @username ou gerencie quem tem acesso ao
                bot.
              </CardDescription>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            {showCreateForm ? (
              <>
                <X className="h-4 w-4" />
                Cancelar
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Cadastrar usuário
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showCreateForm && (
          <form
            onSubmit={handleCreateSubmit}
            className="rounded-xl border bg-muted/40 p-4 space-y-4"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Plus className="h-4 w-4 text-primary" />
              Novo usuário (pré-cadastro pelo painel)
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-user-name">Nome de exibição</Label>
                <Input
                  id="new-user-name"
                  placeholder="Ex.: Thomaz"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-user-username">
                  @username do Telegram (opcional)
                </Label>
                <Input
                  id="new-user-username"
                  placeholder="Ex.: @thomaz"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateForm(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                <Check className="h-4 w-4" />
                Salvar usuário
              </Button>
            </div>
          </form>
        )}

        {users.length === 0 ? (
          <div className="rounded-xl border border-dashed py-10 px-4 text-center">
            <Users className="h-9 w-9 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-sm font-medium">Nenhum usuário cadastrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use o botão &ldquo;Cadastrar usuário&rdquo; acima ou aguarde
              alguém enviar /start no bot.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">@username</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">
                    Animes
                  </th>
                  <th className="px-4 py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => {
                  const isEditing = editingId === user.id;
                  const isConfirmingDelete = confirmDeleteId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium">
                        {isEditing ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 max-w-[180px]"
                            aria-label="Editar nome"
                          />
                        ) : (
                          <Link
                            href={`/usuarios/${user.id}`}
                            className="inline-flex items-center gap-1.5 hover:text-primary transition-colors font-semibold"
                          >
                            <span>{user.name}</span>
                            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                          </Link>
                        )}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {isEditing ? (
                          <Input
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            placeholder="sem @"
                            className="h-8 max-w-[160px]"
                            aria-label="Editar username"
                          />
                        ) : user.username ? (
                          <span className="font-mono text-xs text-foreground">
                            @{user.username}
                          </span>
                        ) : (
                          <span className="text-xs italic">Não informado</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {renderRegistrationBadge(user.registrationState)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary" className="font-mono">
                          {user.entriesCount}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="default"
                                onClick={() => void saveEdit(user.id)}
                                disabled={isSubmitting}
                              >
                                <Check className="h-3.5 w-3.5" />
                                Salvar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                                disabled={isSubmitting}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : isConfirmingDelete ? (
                            <>
                              <span className="text-xs text-destructive font-medium mr-1">
                                Confirmar exclusão?
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => void handleDelete(user)}
                                disabled={isSubmitting}
                              >
                                Excluir
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={isSubmitting}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(user)}
                                title="Editar nome e @username"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only">
                                  Editar
                                </span>
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant={user.active ? 'outline' : 'default'}
                                onClick={() => void handleToggle(user)}
                                disabled={isSubmitting}
                                title={
                                  user.active
                                    ? 'Desativar acesso'
                                    : 'Ativar acesso'
                                }
                              >
                                <Power className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only">
                                  {user.active ? 'Desativar' : 'Ativar'}
                                </span>
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setConfirmDeleteId(user.id);
                                  setEditingId(null);
                                }}
                                title="Remover usuário"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
