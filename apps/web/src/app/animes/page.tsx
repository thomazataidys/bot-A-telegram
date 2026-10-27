import * as React from 'react';
import type { Metadata } from 'next';
import { Tv } from 'lucide-react';
import { ComingSoonCard } from '@/components/coming-soon-card';

export const metadata: Metadata = {
  title: 'Animes',
};

export default function AnimesPage(): React.JSX.Element {
  return (
    <ComingSoonCard
      title="Animes (Lista Global)"
      subtitle="Todos os animes acompanhados pelo grupo, quem assiste cada título e o progresso individual."
      description="Esta página consumirá getGlobalList() e listUsersWithStats() de @animebot/core."
      icon={Tv}
      features={[
        'Catálogo visual com capa, título (inglês/romaji) e status de exibição na AniList',
        'Indicação do próximo episódio e data/hora estimada de lançamento legendado',
        'Lista de quem acompanha cada anime com o respectivo episódio atual e status',
        'Filtros combinados por usuário e por status da lista (Assistindo, Quero ver, Completo)',
      ]}
    />
  );
}
