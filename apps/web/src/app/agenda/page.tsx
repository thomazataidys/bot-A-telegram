import * as React from 'react';
import type { Metadata } from 'next';
import { CalendarDays } from 'lucide-react';
import { ComingSoonCard } from '@/components/coming-soon-card';

export const metadata: Metadata = {
  title: 'Agenda Semanal',
};

export default function AgendaPage(): React.JSX.Element {
  return (
    <ComingSoonCard
      title="Agenda Semanal"
      subtitle="Calendário de segunda a domingo com os lançamentos desta semana e da próxima."
      description="Esta página consumirá getSchedule() e listUsersWithStats() de @animebot/core."
      icon={CalendarDays}
      features={[
        'Alternância rápida entre Esta semana e Próxima semana (segunda a domingo)',
        'Horários já ajustados com o atraso configurado para saída do episódio legendado',
        'Cards diários com capa do anime, número do episódio e amigos que acompanham',
        'Filtro por usuário para visualizar a agenda individual ou global do grupo',
      ]}
    />
  );
}
