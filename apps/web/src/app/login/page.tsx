import * as React from 'react';
import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { LoginForm } from './login-form';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Entrar',
};

export default function LoginPage(): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-background to-muted/40 p-4">
      <header className="flex justify-end max-w-6xl w-full mx-auto pt-2">
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center py-8">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                AnimeBot Admin
              </CardTitle>
              <CardDescription>
                Insira a senha de administrador para gerenciar usuários, listas,
                agenda e notificações do grupo.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </main>

      <footer className="text-center text-xs text-muted-foreground pb-2">
        Painel protegido · Sessão válida por 30 dias
      </footer>
    </div>
  );
}
