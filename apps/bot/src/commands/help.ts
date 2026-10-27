import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';
import { HTML_OPTIONS } from '../messages.js';

export const HELP_TEXT = [
  '<b>Comandos</b>',
  '',
  '/buscar <code>&lt;nome&gt;</code> — busca na AniList (até 5 resultados) com botão para adicionar',
  '/add <code>&lt;nome ou link&gt;</code> — busca e adiciona à sua lista (até 3 opções)',
  '/lista — mostra a sua lista, agrupada por status (toque no anime para ➕1 ep, definir episódio ou mudar o status)',
  '/lista <code>@usuario</code> — mostra a lista de outra pessoa',
  '/global — mostra todos os animes e quem está acompanhando cada um',
  '/semana — episódios da semana na sua lista (<code>/semana todos</code> mostra os de todo mundo)',
  '/proxima — episódios da próxima semana (<code>/proxima todos</code> para todos)',
  '/vi <code>&lt;nome&gt; &lt;ep&gt;</code> — registra o episódio que você viu. Exemplo: /vi solo leveling 5',
  '/remover <code>&lt;nome&gt;</code> — remove um anime da sua lista (pede confirmação)',
  '/ajuda — mostra esta mensagem',
  '',
  '<b>Atalhos</b>',
  '<code>+ nome do anime</code> — mostra até 3 opções para adicionar como assistindo',
  'Cole um link da AniList, MyAnimeList ou Crunchyroll em qualquer mensagem para adicionar à sua lista',
].join('\n');

export function registerHelp(bot: Bot<BotContext>): void {
  bot.command('ajuda', (ctx) => ctx.reply(HELP_TEXT, HTML_OPTIONS));
}
