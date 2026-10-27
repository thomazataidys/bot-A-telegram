import './env.js';
import { prisma } from '@animebot/db';
import { BOT_COMMANDS, createBot } from './bot.js';

const token = process.env['BOT_TOKEN'];
if (!token) throw new Error('BOT_TOKEN não definido (veja .env.example)');

const bot = createBot(token);

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} recebido, encerrando...`);
  await bot.stop();
  await prisma.$disconnect();
  process.exit(0);
}
process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

await bot.api.setMyCommands(BOT_COMMANDS);
await bot.start({
  onStart: (info) => console.log(`Bot @${info.username} iniciado`),
});
