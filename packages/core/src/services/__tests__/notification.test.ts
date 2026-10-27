import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  ListStatus: { ASSISTINDO: 'ASSISTINDO', QUERO_VER: 'QUERO_VER', COMPLETO: 'COMPLETO' },
  prisma: {
    airingEpisode: { findMany: vi.fn(), update: vi.fn() },
    setting: { upsert: vi.fn() },
  },
}));
vi.mock('@animebot/db', () => db);
const settings = vi.hoisted(() => ({ getSettings: vi.fn() }));
vi.mock('../settings.js', () => settings);

import {
  getPendingNotifications,
  markEpisodeNotified,
  processPendingNotifications,
} from '../notification.js';

const NOW = new Date('2026-10-26T12:00:00Z');

function episodeRow(id: string, entries: { progress: number; name: string }[]): unknown {
  return {
    id,
    animeId: `anime-${id}`,
    episode: 8,
    airingAt: new Date('2026-10-26T10:00:00Z'),
    notifiedAt: null,
    anime: {
      id: `anime-${id}`,
      titleEnglish: null,
      titleRomaji: `Anime ${id}`,
      entries: entries.map((e) => ({
        progress: e.progress,
        user: { id: e.name, name: e.name, username: null, telegramId: 1n, active: true },
      })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  settings.getSettings.mockResolvedValue({ groupChatId: '-100', notificationDelayMinutes: 60 });
  db.prisma.airingEpisode.update.mockResolvedValue({});
});

describe('getPendingNotifications', () => {
  it('filtra por notifiedAt nulo, airingAt + delay <= now e só watchers ativos ASSISTINDO/QUERO_VER', async () => {
    db.prisma.airingEpisode.findMany.mockResolvedValue([
      episodeRow('e1', [{ progress: 7, name: 'Ana' }]),
    ]);

    const [pending] = await getPendingNotifications(NOW);

    const args = db.prisma.airingEpisode.findMany.mock.calls[0]?.[0];
    expect(args.where).toEqual({
      notifiedAt: null,
      airingAt: { lte: new Date('2026-10-26T11:00:00Z') },
    });
    expect(args.include.anime.include.entries.where).toEqual({
      status: { in: ['ASSISTINDO', 'QUERO_VER'] },
      user: { active: true },
    });
    expect(pending).toMatchObject({ displayTitle: 'Anime e1', episode: 8 });
    expect(pending?.watchers).toEqual([
      { user: { id: 'Ana', name: 'Ana', username: null, telegramId: 1n }, progress: 7 },
    ]);
  });
});

describe('markEpisodeNotified', () => {
  it('grava notifiedAt', async () => {
    await markEpisodeNotified('e1', NOW);
    expect(db.prisma.airingEpisode.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { notifiedAt: NOW },
    });
  });
});

describe('processPendingNotifications', () => {
  it('envia e só marca notifiedAt depois do envio, registrando a última notificação', async () => {
    db.prisma.airingEpisode.findMany.mockResolvedValue([
      episodeRow('e1', [{ progress: 7, name: 'Ana' }]),
    ]);
    const order: string[] = [];
    const send = vi.fn(() => {
      order.push('send');
      return Promise.resolve();
    });
    db.prisma.airingEpisode.update.mockImplementation(() => {
      order.push('mark');
      return Promise.resolve({});
    });

    const result = await processPendingNotifications(send, NOW);

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ episode: 8 }), '-100');
    expect(order).toEqual(['send', 'mark']);
    expect(result).toMatchObject({ processedCount: 1, sentCount: 1, failedCount: 0 });
    expect(db.prisma.setting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'lastNotificationAt' } }),
    );
  });

  it('falha no envio mantém notifiedAt nulo e segue para os próximos', async () => {
    db.prisma.airingEpisode.findMany.mockResolvedValue([
      episodeRow('e1', [{ progress: 0, name: 'Ana' }]),
      episodeRow('e2', [{ progress: 0, name: 'Bia' }]),
    ]);
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error('telegram fora do ar'))
      .mockResolvedValueOnce(undefined);

    const result = await processPendingNotifications(send, NOW);

    expect(result).toMatchObject({ sentCount: 1, failedCount: 1 });
    expect(db.prisma.airingEpisode.update).toHaveBeenCalledTimes(1);
    expect(db.prisma.airingEpisode.update).toHaveBeenCalledWith({
      where: { id: 'e2' },
      data: { notifiedAt: NOW },
    });
  });

  it('sem watchers ativos só marca notifiedAt, sem enviar', async () => {
    db.prisma.airingEpisode.findMany.mockResolvedValue([episodeRow('e1', [])]);
    const send = vi.fn();

    const result = await processPendingNotifications(send, NOW);

    expect(send).not.toHaveBeenCalled();
    expect(db.prisma.airingEpisode.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { notifiedAt: NOW },
    });
    expect(result).toMatchObject({ skippedNoWatchersCount: 1, sentCount: 0 });
    expect(db.prisma.setting.upsert).not.toHaveBeenCalled();
  });

  it('sem groupChatId não envia nem marca nada', async () => {
    settings.getSettings.mockResolvedValue({ groupChatId: null, notificationDelayMinutes: 60 });
    const send = vi.fn();

    const result = await processPendingNotifications(send, NOW);

    expect(result.groupChatNotConfigured).toBe(true);
    expect(db.prisma.airingEpisode.findMany).not.toHaveBeenCalled();
    expect(db.prisma.airingEpisode.update).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('não sobrepõe execuções', async () => {
    db.prisma.airingEpisode.findMany.mockResolvedValue([
      episodeRow('e1', [{ progress: 0, name: 'Ana' }]),
    ]);
    let release: () => void = () => undefined;
    const send = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    const first = processPendingNotifications(send, NOW);
    await vi.waitFor(() => expect(send).toHaveBeenCalled());
    const second = await processPendingNotifications(send, NOW);
    expect(second.processedCount).toBe(0);
    expect(send).toHaveBeenCalledTimes(1);

    release();
    await first;
  });
});
