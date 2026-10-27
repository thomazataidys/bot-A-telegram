import * as React from 'react';
import type { Metadata } from 'next';
import {
  Bell,
  CalendarClock,
  LayoutDashboard,
  RefreshCw,
  Tv,
  Users,
} from 'lucide-react';
import { ComingSoonCard } from '@/components/coming-soon-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const PREVIEW_CARDS = [
  {
    title: 'Usuários Ativos',
    value: '—',
    subtitle: 'Membros acompanhando animes no grupo',
    icon: Users,
  },
  {
    title: 'Animes Monitorados',
    value: '—',
    subtitle: 'Títulos únicos nas listas do grupo',
    icon: Tv,
  },
  {
    title: 'Próximos Episódios (48h)',
    value: '—',
    subtitle: 'Lançamentos estimados com atraso do legendado',
    icon: CalendarClock,
  },
  {
    title: 'Sincronização & Avisos',
    value: 'Em breve',
    subtitle: 'Status do último sync com a AniList e notificações',
    icon: RefreshCw,
  },
] as const;

export default function DashboardPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <ComingSoonCard
        title="Dashboard"
        subtitle="Visão geral do bot de animes, métricas do grupo e lançamentos das próximas 48 horas."
        description="Os indicadores abaixo serão conectados ao serviço getDashboardStats() de @animebot/core na próxima etapa."
        icon={LayoutDashboard}
        features={[
          'Contagem de usuários ativos e total de membros cadastrados',
          'Total de animes únicos monitorados pelo grupo',
          'Lista de episódios que saem nas próximas 48 horas (horário legendado)',
          'Horário da última sincronização com a AniList e última notificação enviada',
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PREVIEW_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <CardDescription className="text-xs mt-1">
                  {card.subtitle}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">
              Próximos episódios (próximas 48 horas)
            </CardTitle>
          </div>
          <CardDescription>
            Quando integrado ao @animebot/core, os episódios previstos para sair
            legendados aparecerão aqui com os usuários marcados.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
