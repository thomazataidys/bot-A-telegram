import { AnimeAlreadyInListError } from '@animebot/core';
import type { ListEntryWithAnime } from '@animebot/core';
import { describe, expect, it, vi } from 'vitest';
import { addAndReply } from '../add-flow.js';
import type { BotContext } from '../context.js';
import { HELP_TEXT } from '../commands/help.js';

const entry = {
  id: 'e1',
  status: 'ASSISTINDO',
  progress: 0,
  anime: {
    titleEnglish: 'Solo Leveling',
    titleRomaji: 'Ore dake Level Up na Ken',
    siteUrl: 'https://anilist.co/anime/1',
    totalEpisodes: 12,
  },
} as unknown as ListEntryWithAnime;

function fakeCtx() {
  const reply = vi.fn().mockResolvedValue(undefined);
  return { ctx: { reply } as unknown as BotContext, reply };
}

describe('addAndReply', () => {
  it('responde com o card e os botões da nova entrada', async () => {
    const { ctx, reply } = fakeCtx();
    await expect(addAndReply(ctx, async () => entry)).resolves.toBe('added');
    expect(reply.mock.calls[0]?.[0]).toContain('Adicionado à sua lista');
    expect(reply.mock.calls[0]?.[1].reply_markup.inline_keyboard.length).toBeGreaterThan(0);
  });

  it('avisa "Já está na sua lista" com os botões da entrada existente', async () => {
    const { ctx, reply } = fakeCtx();
    const outcome = await addAndReply(ctx, async () => {
      throw new AnimeAlreadyInListError(entry);
    });
    expect(outcome).toBe('already');
    expect(reply.mock.calls[0]?.[0]).toContain('Já está na sua lista');
    expect(reply.mock.calls[0]?.[1].reply_markup.inline_keyboard.flat()[0].callback_data).toBe(
      'inc:e1',
    );
  });

  it('propaga outros erros', async () => {
    const { ctx } = fakeCtx();
    await expect(
      addAndReply(ctx, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });
});

describe('ajuda', () => {
  it('documenta o atalho + e os links', () => {
    expect(HELP_TEXT).toContain('+ nome do anime');
    expect(HELP_TEXT).toContain('Crunchyroll');
  });
});
