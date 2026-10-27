'use client';

import * as React from 'react';
import { AlertCircle, KeyRound, Loader2 } from 'lucide-react';
import { loginAction, type LoginActionState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: LoginActionState = {};

export function LoginForm(): React.JSX.Element {
  const [state, formAction, isPending] = React.useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Senha de Administrador</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Digite a senha do painel..."
            autoComplete="current-password"
            required
            disabled={isPending}
            className="pl-9"
          />
        </div>
      </div>

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Entrando...
          </>
        ) : (
          'Entrar no painel'
        )}
      </Button>
    </form>
  );
}
