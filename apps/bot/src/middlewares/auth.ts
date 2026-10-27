import { upsertTelegramUser } from '@animebot/core';
import type { Middleware } from 'grammy';
import type { BotContext } from '../context.js';
import { PENDING_APPROVAL_TEXT } from '../messages.js';

/** Identifica o usuário (6.1) e bloqueia quem ainda não foi aprovado. */
export const authMiddleware: Middleware<BotContext> = async (ctx, next) => {
  const from = ctx.from;
  if (!from || from.is_bot) return;

  const name = [from.first_name, from.last_name].filter(Boolean).join(' ');
  const { user } = await upsertTelegramUser({
    telegramId: BigInt(from.id),
    username: from.username ?? null,
    name,
  });
  ctx.user = user;

  if (!user.active) {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: PENDING_APPROVAL_TEXT, show_alert: true });
    } else if (ctx.chat) {
      await ctx.reply(PENDING_APPROVAL_TEXT);
    }
    return;
  }
  await next();
};
