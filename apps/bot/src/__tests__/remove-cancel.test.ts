import type * as coreModule from '@animebot/core';
import { EntryNotFoundError } from '@animebot/core';
import type { Bot } from 'grammy';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const core = vi.hoisted(() => ({ getEntryById: vi.fn() }));
vi.mock('@animebot/core', async (importOriginal) => ({
  ...(await importOriginal<typeof coreModule>()),
  getEntryById: core.getEntryById,
}));

import { BOT_COMMANDS, GROUP_ADMIN_COMMANDS } from '../bot.js';
import { HELP_TEXT } from '../commands/help.js';
import { registerRemove } from '../commands/remove.js';
import type { BotContext } from '../context.js';
import { NOT_OWNER_TEXT } from '../messages.js';

type Handler = (ctx: unknown) => Promise<void>;

function captureCancelHandler(): Handler {
  const handlers = new Map<string, Handler>();
  const bot = {
    command: vi.fn(),
    callbackQuery: (pattern: RegExp, handler: Handler) => handlers.set(pattern.source, handler),
  } as unknown as Bot<BotContext>;
  registerRemove(bot);
  const handler = handlers.get('^rmn:(.+)$');
  if (!handler) throw new Error('handler rmn: não registrado');
  return handler;
}

function fakeCtx(userId: string) {
  return {
    match: ['rmn:e1', 'e1'],
    user: { id: userId },
    answerCallbackQuery: vi.fn(),
    editMessageText: vi.fn(),
  };
}

describe('callback rmn: (cancelar remoção)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bloqueia quem não é dono da entrada e mantém o prompt', async () => {
    core.getEntryById.mockResolvedValue({ id: 'e1', userId: 'dono' });
    const ctx = fakeCtx('intruso');

    await captureCancelHandler()(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: NOT_OWNER_TEXT,
      show_alert: true,
    });
    expect(ctx.editMessageText).not.toHaveBeenCalled();
  });

  it('cancela quando quem clicou é o dono', async () => {
    core.getEntryById.mockResolvedValue({ id: 'e1', userId: 'dono' });
    const ctx = fakeCtx('dono');

    await captureCancelHandler()(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: 'Cancelado.' });
    expect(ctx.editMessageText).toHaveBeenCalledWith('Remoção cancelada.', {
      reply_markup: undefined,
    });
  });

  it('encerra o prompt se a entrada já foi removida', async () => {
    core.getEntryById.mockRejectedValue(new EntryNotFoundError('e1'));
    const ctx = fakeCtx('dono');

    await captureCancelHandler()(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledWith('Remoção cancelada.', {
      reply_markup: undefined,
    });
  });
});

describe('/configurargrupo', () => {
  it('fica fora da lista padrão e só no escopo de admins de grupo', () => {
    expect(BOT_COMMANDS.map((c) => c.command)).not.toContain('configurargrupo');
    expect(GROUP_ADMIN_COMMANDS.map((c) => c.command)).toContain('configurargrupo');
  });

  it('é mencionado em /ajuda como comando de admin', () => {
    expect(HELP_TEXT).toContain('/configurargrupo');
  });
});
