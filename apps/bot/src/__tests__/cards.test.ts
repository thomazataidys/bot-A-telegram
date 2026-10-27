import type { PendingNotification } from '@animebot/core';
import type { Api } from 'grammy';
import { describe, expect, it, vi } from 'vitest';
import { CAPTION_LIMIT, editCard, fitCaption, sendAnimeCard } from '../cards.js';
import type { BotContext } from '../context.js';
import { notificationImage } from '../jobs/notification-job.js';
import { animeImage } from '../keyboards/entry.js';

const keyboard = { inline_keyboard: [[{ text: 'ok', callback_data: 'x' }]] };

describe('fitCaption', () => {
  it('mantém legendas dentro do limite', () => {
    expect(fitCaption('<b>oi</b>')).toBe('<b>oi</b>');
    expect(fitCaption('a'.repeat(CAPTION_LIMIT))).toHaveLength(CAPTION_LIMIT);
  });

  it('corta em 1024 com reticências', () => {
    const result = fitCaption('a'.repeat(2000));
    expect(result).toHaveLength(CAPTION_LIMIT);
    expect(result.endsWith('a…')).toBe(true);
  });

  it('fecha as tags abertas e não deixa tag nem entidade pela metade', () => {
    const html = `<b><a href="https://anilist.co/anime/1?a=1&amp;b=2">${'x &amp; y '.repeat(200)}</a></b>`;
    const result = fitCaption(html, 100);
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result).toMatch(
      /^<b><a href="https:\/\/anilist\.co\/anime\/1\?a=1&amp;b=2">.*…<\/a><\/b>$/,
    );
    // Toda "&" restante pertence a uma entidade completa.
    expect(result.replaceAll('&amp;', '')).not.toContain('&');
  });

  it('não corta a tag de abertura ao meio quando o limite cai nela', () => {
    const result = fitCaption(
      `${'a'.repeat(95)}<a href="https://example.com/very/long/url">link</a>`,
      100,
    );
    expect(result).toBe(`${'a'.repeat(95)}…`);
  });
});

describe('sendAnimeCard', () => {
  const card = { imageUrl: 'https://img/1.jpg', caption: '<b>Anime</b>', keyboard };

  function fakeCtx(photo = vi.fn().mockResolvedValue(undefined)) {
    const reply = vi.fn().mockResolvedValue(undefined);
    return { ctx: { reply, replyWithPhoto: photo } as unknown as BotContext, reply, photo };
  }

  it('envia foto com legenda HTML e botões', async () => {
    const { ctx, reply, photo } = fakeCtx();
    await sendAnimeCard(ctx, card);
    expect(photo).toHaveBeenCalledWith('https://img/1.jpg', {
      caption: '<b>Anime</b>',
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    expect(reply).not.toHaveBeenCalled();
  });

  it('limita a legenda a 1024 caracteres', async () => {
    const { ctx, photo } = fakeCtx();
    await sendAnimeCard(ctx, { ...card, caption: 'a'.repeat(3000) });
    const caption = (photo.mock.calls[0]?.[1] as { caption: string }).caption;
    expect(caption).toHaveLength(CAPTION_LIMIT);
  });

  it('sem imagem envia só texto', async () => {
    const { ctx, reply, photo } = fakeCtx();
    await sendAnimeCard(ctx, { ...card, imageUrl: null });
    expect(photo).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      '<b>Anime</b>',
      expect.objectContaining({ parse_mode: 'HTML', reply_markup: keyboard }),
    );
  });

  it('se o sendPhoto falhar, cai para texto normal', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { ctx, reply } = fakeCtx(vi.fn().mockRejectedValue(new Error('wrong file identifier')));
    await sendAnimeCard(ctx, card);
    expect(reply).toHaveBeenCalledWith(
      '<b>Anime</b>',
      expect.objectContaining({ reply_markup: keyboard }),
    );
    warn.mockRestore();
  });

  it('com Api usa o chatId informado, com o mesmo fallback', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sendPhoto = vi.fn().mockRejectedValue(new Error('boom'));
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const api = { sendPhoto, sendMessage } as unknown as Api;

    await sendAnimeCard(api, card, '-100');

    expect(sendPhoto).toHaveBeenCalledWith('-100', 'https://img/1.jpg', expect.any(Object));
    expect(sendMessage).toHaveBeenCalledWith('-100', '<b>Anime</b>', expect.any(Object));
    await expect(sendAnimeCard(api, card)).rejects.toThrow('chatId');
    warn.mockRestore();
  });
});

describe('editCard', () => {
  function ctxWith(message: unknown) {
    const editMessageCaption = vi.fn().mockResolvedValue(undefined);
    const editMessageText = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { message },
      editMessageCaption,
      editMessageText,
    } as unknown as BotContext;
    return { ctx, editMessageCaption, editMessageText };
  }

  it('edita a legenda quando a mensagem é uma foto', async () => {
    const { ctx, editMessageCaption, editMessageText } = ctxWith({ photo: [{ file_id: 'f' }] });
    await editCard(ctx, '<b>Novo</b>', keyboard);
    expect(editMessageCaption).toHaveBeenCalledWith({
      caption: '<b>Novo</b>',
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    expect(editMessageText).not.toHaveBeenCalled();
  });

  it('edita o texto quando a mensagem não tem foto', async () => {
    const { ctx, editMessageCaption, editMessageText } = ctxWith({ text: 'oi' });
    await editCard(ctx, '<b>Novo</b>', keyboard);
    expect(editMessageText).toHaveBeenCalledWith(
      '<b>Novo</b>',
      expect.objectContaining({ parse_mode: 'HTML', reply_markup: keyboard }),
    );
    expect(editMessageCaption).not.toHaveBeenCalled();
  });

  it('sem teclado remove os botões e limita a legenda', async () => {
    const { ctx, editMessageCaption } = ctxWith({ photo: [{ file_id: 'f' }] });
    await editCard(ctx, 'a'.repeat(2000));
    const args = editMessageCaption.mock.calls[0]?.[0] as {
      caption: string;
      reply_markup?: unknown;
    };
    expect(args.caption).toHaveLength(CAPTION_LIMIT);
    expect(args.reply_markup).toBeUndefined();
  });
});

describe('escolha de imagem', () => {
  const notification = (bannerUrl: string | null, coverUrl: string | null) =>
    ({ anime: { bannerUrl, coverUrl } }) as unknown as PendingNotification;

  it('notificação prefere o banner e cai para a capa', () => {
    expect(notificationImage(notification('https://b', 'https://c'))).toBe('https://b');
    expect(notificationImage(notification(null, 'https://c'))).toBe('https://c');
    expect(notificationImage(notification(null, null))).toBeNull();
  });

  it('cards de anime preferem a capa e caem para o banner', () => {
    expect(animeImage({ coverUrl: 'https://c', bannerUrl: 'https://b' })).toBe('https://c');
    expect(animeImage({ coverUrl: null, bannerUrl: 'https://b' })).toBe('https://b');
  });
});
