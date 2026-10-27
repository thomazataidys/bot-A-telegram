'use client';

import * as React from 'react';
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Save,
  Send,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  settingsFormSchema,
  type AppSettings,
  type SyncResult,
} from '@/types/contracts';
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
import { Separator } from '@/components/ui/separator';

export { settingsFormSchema };

export interface SettingsFormProps {
  initialSettings: AppSettings;
  onSaveSettings?: (settings: AppSettings) => Promise<void> | void;
  onSendTestMessage?: (groupChatId: string) => Promise<void> | void;
  onSyncNow?: () => Promise<SyncResult | void> | void;
  syncDisabled?: boolean;
  syncDisabledTooltip?: string;
}

export function SettingsForm({
  initialSettings,
  onSaveSettings,
  onSendTestMessage,
  onSyncNow,
  syncDisabled = false,
  syncDisabledTooltip = 'Disponível em breve',
}: SettingsFormProps): React.JSX.Element {
  const [groupChatId, setGroupChatId] = React.useState(
    initialSettings.groupChatId ?? '',
  );
  const [notificationDelayMinutes, setNotificationDelayMinutes] =
    React.useState(String(initialSettings.notificationDelayMinutes));
  const [syncIntervalMinutes, setSyncIntervalMinutes] = React.useState(
    String(initialSettings.syncIntervalMinutes),
  );
  const [timezone, setTimezone] = React.useState(initialSettings.timezone);
  const [autoApproveUsers, setAutoApproveUsers] = React.useState(
    initialSettings.autoApproveUsers,
  );

  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSendingTest, setIsSendingTest] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setValidationError(null);

    const parsed = settingsFormSchema.safeParse({
      groupChatId,
      notificationDelayMinutes,
      syncIntervalMinutes,
      timezone,
      autoApproveUsers,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const msg = firstIssue?.message ?? 'Verifique os campos do formulário.';
      setValidationError(msg);
      toast.error(msg);
      return;
    }

    const payload: AppSettings = {
      groupChatId:
        parsed.data.groupChatId.length > 0 ? parsed.data.groupChatId : null,
      notificationDelayMinutes: parsed.data.notificationDelayMinutes,
      syncIntervalMinutes: parsed.data.syncIntervalMinutes,
      timezone: parsed.data.timezone,
      autoApproveUsers: parsed.data.autoApproveUsers,
    };

    setIsSaving(true);
    try {
      await onSaveSettings?.(payload);
      toast.success('Configurações salvas com sucesso!');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao salvar configurações.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestMessage(): Promise<void> {
    const trimmedChatId = groupChatId.trim();
    if (!trimmedChatId) {
      toast.error(
        'Configure o ID do grupo (groupChatId) antes de enviar uma mensagem de teste.',
      );
      return;
    }

    setIsSendingTest(true);
    try {
      await onSendTestMessage?.(trimmedChatId);
      toast.success('Mensagem de teste enviada para o grupo do Telegram!');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Falha ao enviar mensagem de teste.';
      toast.error(msg);
    } finally {
      setIsSendingTest(false);
    }
  }

  async function handleSyncNow(): Promise<void> {
    setIsSyncing(true);
    try {
      const result = await onSyncNow?.();
      if (result && typeof result === 'object') {
        toast.success(
          `Sincronização concluída: ${result.syncedAnimesCount} animes e ${result.upsertedEpisodesCount} episódios atualizados.`,
        );
      } else {
        toast.success('Sincronização com a AniList concluída!');
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao sincronizar agora.';
      toast.error(msg);
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Configurações do Sistema</CardTitle>
            <CardDescription>
              Parâmetros globais de notificação, sincronização com a AniList e
              aprovação de usuários.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settings-groupChatId">
                ID do Grupo no Telegram (groupChatId)
              </Label>
              <Input
                id="settings-groupChatId"
                placeholder="Ex.: -1001234567890"
                value={groupChatId}
                onChange={(e) => setGroupChatId(e.target.value)}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Pode ser definido aqui ou enviando /configurargrupo dentro do
                grupo.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-timezone">Fuso Horário (IANA)</Label>
              <Input
                id="settings-timezone"
                placeholder="America/Fortaleza"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={isSaving}
                required
              />
              <p className="text-xs text-muted-foreground">
                Padrão: America/Fortaleza (UTC-3). Usado na agenda e avisos.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-delay">
                Atraso da Notificação (minutos após exibição no Japão)
              </Label>
              <Input
                id="settings-delay"
                type="number"
                min={0}
                max={1440}
                value={notificationDelayMinutes}
                onChange={(e) => setNotificationDelayMinutes(e.target.value)}
                disabled={isSaving}
                required
              />
              <p className="text-xs text-muted-foreground">
                Padrão: 60 min (1h para sair episódio legendado).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-sync">
                Intervalo de Sincronização com a AniList (minutos)
              </Label>
              <Input
                id="settings-sync"
                type="number"
                min={5}
                max={720}
                value={syncIntervalMinutes}
                onChange={(e) => setSyncIntervalMinutes(e.target.value)}
                disabled={isSaving}
                required
              />
              <p className="text-xs text-muted-foreground">
                Padrão: 30 min. Frequência de atualização da grade de episódios.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
            <input
              id="settings-autoApprove"
              type="checkbox"
              checked={autoApproveUsers}
              onChange={(e) => setAutoApproveUsers(e.target.checked)}
              disabled={isSaving}
              className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            <div className="space-y-1">
              <Label
                htmlFor="settings-autoApprove"
                className="cursor-pointer font-semibold"
              >
                Aprovar novos usuários automaticamente (autoApproveUsers)
              </Label>
              <p className="text-xs text-muted-foreground">
                Se ativado, qualquer membro que enviar /start ao bot já poderá
                usar os comandos imediatamente. Se desativado, precisará ser
                aprovado na tela de Usuários.
              </p>
            </div>
          </div>

          {validationError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar configurações
                </>
              )}
            </Button>
          </div>
        </form>

        <Separator />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Ações Manuais</h3>
            <p className="text-xs text-muted-foreground">
              Teste o envio de mensagens no grupo ou force uma sincronização
              imediata com a AniList.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleTestMessage()}
              disabled={isSendingTest || isSyncing}
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando teste...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar mensagem de teste no grupo
                </>
              )}
            </Button>

            <span
              title={
                syncDisabled || !onSyncNow ? syncDisabledTooltip : undefined
              }
              className="inline-flex"
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleSyncNow()}
                disabled={
                  syncDisabled || !onSyncNow || isSyncing || isSendingTest
                }
                title={
                  syncDisabled || !onSyncNow ? syncDisabledTooltip : undefined
                }
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sincronizar agora
                  </>
                )}
              </Button>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
