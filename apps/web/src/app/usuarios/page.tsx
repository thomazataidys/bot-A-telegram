import * as React from 'react';
import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import { ComingSoonCard } from '@/components/coming-soon-card';

export const metadata: Metadata = {
  title: 'Usuários',
};

export default function UsuariosPage(): React.JSX.Element {
  return (
    <ComingSoonCard
      title="Usuários"
      subtitle="Gerencie quem participa do grupo, aprove acessos e edite as listas individuais."
      description="Esta página consumirá listUsersWithStats(), createUserFromPanel(), updateUser(), setUserActive() e deleteUser() de @animebot/core."
      icon={Users}
      features={[
        'Tabela com nome, @username, status (ativo, aguardando aprovação ou ainda não falou com o bot) e nº de animes',
        'Pré-cadastro de amigos por nome e @username (vínculo automático quando falarem com o bot)',
        'Edição de dados cadastrais, ativação/desativação de conta e exclusão',
        'Acesso direto à lista individual de cada usuário (/usuarios/[id])',
      ]}
    />
  );
}
