import * as React from 'react';
import type { Metadata } from 'next';
import { ListVideo } from 'lucide-react';
import { ComingSoonCard } from '@/components/coming-soon-card';

export const metadata: Metadata = {
  title: 'Lista do Usuário',
};

export default async function UsuarioDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;

  return (
    <ComingSoonCard
      title={`Lista do Usuário (${id})`}
      subtitle="Visualização e edição completa dos animes acompanhados por este usuário."
      description="Esta página consumirá getUserById(), getUserList(), searchAnime(), addAnimeByAnilistId(), setProgress(), setStatus() e removeEntry() de @animebot/core."
      icon={ListVideo}
      features={[
        'Abas organizadas por status: Assistindo, Quero ver e Completo',
        'Edição inline de progresso (episódio atual) e mudança rápida de status',
        'Busca na AniList com autocomplete para adicionar novos animes à lista',
        'Remoção de entradas com confirmação',
      ]}
    />
  );
}
