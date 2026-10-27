import * as React from 'react';
import type { Metadata } from 'next';
import { getSettings } from '@animebot/core';
import {
  saveSettingsAction,
  sendTestGroupMessageAction,
} from './actions';
import { SettingsForm } from '@/components/settings-form';

export const metadata: Metadata = {
  title: 'Configurações',
};

export const dynamic = 'force-dynamic';

export default async function ConfiguracoesPage(): Promise<React.JSX.Element> {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie o ID do grupo do Telegram, o atraso das notificações, o fuso
          horário e a aprovação automática de novos membros.
        </p>
      </div>

      <SettingsForm
        initialSettings={settings}
        onSaveSettings={saveSettingsAction}
        onSendTestMessage={sendTestGroupMessageAction}
        syncDisabled
        syncDisabledTooltip="Disponível em breve"
      />
    </div>
  );
}
