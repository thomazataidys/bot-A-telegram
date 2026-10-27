import * as React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/app-shell';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: {
    default: 'AnimeBot — Painel Administrativo',
    template: '%s | AnimeBot',
  },
  description:
    'Painel administrativo do Bot de Animes do Telegram: listas, progresso, agenda semanal e notificações.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
