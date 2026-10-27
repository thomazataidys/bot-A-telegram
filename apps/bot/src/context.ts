import type { User } from '@animebot/db';
import type { Context } from 'grammy';

export interface BotFlavor {
  /** Usuário do banco, preenchido pelo middleware de autenticação. */
  user: User;
}

export type BotContext = Context & BotFlavor;
