import { Bot, GrammyError } from 'grammy';
import type { BotError } from 'grammy';
import { registerNotificationWatch } from './callbacks/notification-watch.js';
import { registerEntryActions } from './callbacks/entry-actions.js';
import { registerAdd } from './commands/add.js';
import { registerConfigGroup } from './commands/config-group.js';
import { registerGlobal } from './commands/global.js';
import { registerHelp } from './commands/help.js';
import { registerList } from './commands/list.js';
import { registerRemove } from './commands/remove.js';
import { registerSearch } from './commands/search.js';
import { registerStart } from './commands/start.js';
import { registerVi } from './commands/vi.js';
import type { BotContext } from './context.js';
import { registerMessageLinks } from './handlers/message-links.js';
import { GENERIC_ERROR_TEXT, NOT_OWNER_TEXT, errorMessage } from './messages.js';
import { authMiddleware } from './middlewares/auth.js';

export const BOT_COMMANDS = [
  { command: 'start', description: 'Começar a usar o bot' },
  { command: 'ajuda', description: 'Ver comandos e atalhos' },
  { command: 'buscar', description: 'Buscar um anime pelo nome' },
  { command: 'add', description: 'Adicionar um anime à sua lista' },
  { command: 'lista', description: 'Ver a sua lista (ou /lista @usuario)' },
  { command: 'global', description: 'Ver a lista global de todos os usuários' },
  { command: 'vi', description: 'Registrar o episódio que você viu' },
  { command: 'remover', description: 'Remover um anime da sua lista' },
];

async function handleError({ error, ctx }: BotError<BotContext>): Promise<void> {
  // Mensagem antiga demais para responder o callback: não há o que fazer.
  if (
    error instanceof GrammyError &&
    /query is too old|message is not modified/.test(error.description)
  ) {
    return;
  }
  const message = errorMessage(error);
  if (message === null) console.error('Erro não tratado no bot:', error);

  try {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({
        text: message ?? GENERIC_ERROR_TEXT,
        show_alert: message === NOT_OWNER_TEXT,
      });
    } else if (ctx.chat) {
      await ctx.reply(message ?? GENERIC_ERROR_TEXT);
    }
  } catch (replyError) {
    console.error('Falha ao avisar o usuário sobre o erro:', replyError);
  }
}

export function createBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  bot.use(authMiddleware);
  registerEntryActions(bot);
  registerStart(bot);
  registerHelp(bot);
  registerSearch(bot);
  registerAdd(bot);
  registerList(bot);
  registerRemove(bot);
  registerVi(bot);
  registerGlobal(bot);
  registerConfigGroup(bot);
  registerNotificationWatch(bot);
  // Depois do handler de "✏️ Definir ep" (registerEntryActions), que consome o número antes.
  registerMessageLinks(bot);

  bot.catch(handleError);
  return bot;
}
