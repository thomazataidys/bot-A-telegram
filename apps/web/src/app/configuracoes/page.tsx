import * as React from 'react';
import type { Metadata } from 'next';
import { Settings } from 'lucide-react';
import { ComingSoonCard } from '@/components/coming-soon-card';

export const metadata: Metadata = {
  title: 'Configurações',
};

export default function ConfiguracoesPage(): React.JSX.Element {
  return (
    <ComingSoonCard
      title="Configurações"
      subtitle="Ajuste os parâmetros do grupo do Telegram, atraso das notificações, fuso horário e sincronização."
      description="Esta página consumirá getSettings(), updateSettings() e syncTrackedAnimes() de @animebot/core."
      icon={Settings}
      features={[
        'Edição de groupChatId, notificationDelayMinutes, syncIntervalMinutes, timezone e autoApproveUsers',
        'Botão para enviar mensagem de teste diretamente no grupo do Telegram',
        'Botão para disparar sincronização imediata com a AniList (Sincronizar agora)',
        'Validação com Zod e feedback visual de sucesso ou erro',
      ]}
    />
  );
}
