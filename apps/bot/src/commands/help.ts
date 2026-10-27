import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';
import { HTML_OPTIONS } from '../messages.js';

export const HELP_TEXT = [
  '<b>Comandos</b>',
  '',
  '/buscar <code>&lt;nome&gt;</code> — busca na AniList (até 5 resultados) com botão para adicionar',
  '/add <code>&lt;nome&gt;</code> — busca e adiciona à sua lista (até 3 opções)',
  '/lista — mostra a sua lista, agrupada por status',
  '/remover <code>&lt;nome&gt;</code> — remove um anime da sua lista (pede confirmação)',
  '/ajuda — mostra esta mensagem',
].join('\n');

export function registerHelp(bot: Bot<BotContext>): void {
  bot.command('ajuda', (ctx) => ctx.reply(HELP_TEXT, HTML_OPTIONS));
}
