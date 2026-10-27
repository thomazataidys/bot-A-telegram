import './env.js';
import { prisma } from '@animebot/db';
import { BOT_COMMANDS, GROUP_ADMIN_COMMANDS, createBot } from './bot.js';
import { startScheduler } from './jobs/scheduler.js';

const token = process.env['BOT_TOKEN'];
if (!token) throw new Error('BOT_TOKEN não definido (veja .env.example)');

const bot = createBot(token);

let scheduler: { stop: () => void } | undefined;

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} recebido, encerrando...`);
  scheduler?.stop();
  await bot.stop();
  await prisma.$disconnect();
  process.exit(0);
}
process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

await bot.api.setMyCommands(BOT_COMMANDS);
await bot.api.setMyCommands(GROUP_ADMIN_COMMANDS, { scope: { type: 'all_chat_administrators' } });
await bot.start({
  onStart: (info) => {
    console.log(`Bot @${info.username} iniciado`);
    scheduler = startScheduler(bot.api);
  },
});
