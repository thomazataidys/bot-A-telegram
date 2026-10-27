import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  prisma: {
    airingEpisode: { findMany: vi.fn() },
    user: { count: vi.fn() },
    anime: { count: vi.fn() },
    setting: { findMany: vi.fn() },
  },
}));
vi.mock('@animebot/db', () => db);
const settings = vi.hoisted(() => ({ getSettings: vi.fn() }));
vi.mock('../settings.js', () => settings);

import { getDashboardStats } from '../dashboard.js';
import { getSchedule, getUpcomingEpisodes, getWeekRange } from '../schedule.js';

const TZ = 'America/Fortaleza';

function row(id: string, airingAt: string, episode = 1): unknown {
  return {
    id,
    animeId: `a-${id}`,
    episode,
    airingAt: new Date(airingAt),
    notifiedAt: null,
    anime: {
      id: `a-${id}`,
      titleEnglish: null,
      titleRomaji: `Anime ${id}`,
      entries: [
        {
          id: `entry-${id}`,
          status: 'ASSISTINDO',
          progress: 2,
          user: { id: 'u1', name: 'Ana', username: 'ana', telegramId: 1n, active: true },
        },
      ],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  settings.getSettings.mockResolvedValue({ notificationDelayMinutes: 60, timezone: TZ });
  db.prisma.airingEpisode.findMany.mockResolvedValue([]);
});

describe('getWeekRange', () => {
  it('semana começa na segunda 00:00 e termina no domingo 23:59:59.999 no fuso', () => {
    const range = getWeekRange(0, TZ, new Date('2026-10-28T15:00:00Z')); // quarta
    expect(range.startUtc.toISOString()).toBe('2026-10-26T03:00:00.000Z');
    expect(range.endUtc.toISOString()).toBe('2026-11-02T02:59:59.999Z');
    expect(range.periodLabel).toBe('26/10 – 01/11');
  });

  it('domingo 22h BRT (segunda 01h UTC) ainda pertence à semana que termina', () => {
    const range = getWeekRange(0, TZ, new Date('2026-11-02T01:00:00Z'));
    expect(range.startUtc.toISOString()).toBe('2026-10-26T03:00:00.000Z');
    expect(range.endUtc.toISOString()).toBe('2026-11-02T02:59:59.999Z');
  });

  it('segunda 00:00 local (03:00Z) já é a semana seguinte; 1ms antes ainda não', () => {
    expect(getWeekRange(0, TZ, new Date('2026-11-02T03:00:00Z')).startUtc.toISOString()).toBe(
      '2026-11-02T03:00:00.000Z',
    );
    expect(getWeekRange(0, TZ, new Date('2026-11-02T02:59:59.999Z')).startUtc.toISOString()).toBe(
      '2026-10-26T03:00:00.000Z',
    );
  });

  it('offset 1 é a próxima semana e atravessa virada de mês/ano', () => {
    const range = getWeekRange(1, TZ, new Date('2026-12-30T12:00:00Z'));
    expect(range.startUtc.toISOString()).toBe('2027-01-04T03:00:00.000Z');
    expect(range.periodLabel).toBe('04/01 – 10/01');
  });

  it('respeita o fuso: mesma hora UTC cai em semanas diferentes em fusos diferentes', () => {
    const now = new Date('2026-11-02T01:00:00Z'); // segunda 01h UTC
    expect(getWeekRange(0, 'UTC', now).startUtc.toISOString()).toBe('2026-11-02T00:00:00.000Z');
    expect(getWeekRange(0, TZ, now).startUtc.toISOString()).toBe('2026-10-26T03:00:00.000Z');
  });
});

describe('getSchedule', () => {
  const NOW = new Date('2026-10-28T15:00:00Z');

  it('consulta airingAt deslocado pelo delay e filtra por userId', async () => {
    await getSchedule({ userId: 'u1', offsetWeeks: 0, now: NOW });
    const args = db.prisma.airingEpisode.findMany.mock.calls[0]?.[0];
    expect(args.where.airingAt).toEqual({
      gte: new Date('2026-10-26T02:00:00.000Z'),
      lte: new Date('2026-11-02T01:59:59.999Z'),
    });
    expect(args.where.anime).toEqual({ entries: { some: { userId: 'u1' } } });
  });

  it('agenda global não filtra por usuário (só animes com alguma entrada)', async () => {
    await getSchedule({ now: NOW });
    expect(db.prisma.airingEpisode.findMany.mock.calls[0]?.[0].where.anime).toEqual({
      entries: { some: {} },
    });
  });

  it('episódio que cruza a meia-noite após o delay vai para o dia seguinte', async () => {
    // 02:30Z → 23:30 BRT (dom 25/10) no Japão; +60min → 03:30Z = seg 26/10 00:30 BRT
    db.prisma.airingEpisode.findMany.mockResolvedValue([
      row('x', '2026-10-26T02:30:00Z'),
      row('y', '2026-10-27T16:00:00Z', 3),
    ]);
    const result = await getSchedule({ now: NOW });
    expect(result.items[0]).toMatchObject({
      dayKey: '2026-10-26',
      formattedTime: '00:30',
      formattedDayHeader: 'Segunda, 26/10',
    });
    expect(result.items[0]?.japanAiringAt.toISOString()).toBe('2026-10-26T02:30:00.000Z');
    expect(result.items[0]?.subbedAiringAt.toISOString()).toBe('2026-10-26T03:30:00.000Z');
    expect(result.days.map((d) => [d.dayKey, d.items.length])).toEqual([
      ['2026-10-26', 1],
      ['2026-10-27', 1],
    ]);
    expect(result.items[0]?.watchers).toEqual([
      {
        user: { id: 'u1', name: 'Ana', username: 'ana', telegramId: 1n, active: true },
        entryId: 'entry-x',
        status: 'ASSISTINDO',
        progress: 2,
      },
    ]);
    expect(result.delayMinutes).toBe(60);
    expect(result.weekRange.periodLabel).toBe('26/10 – 01/11');
  });

  it('agrupa itens do mesmo dia local', async () => {
    db.prisma.airingEpisode.findMany.mockResolvedValue([
      row('a', '2026-10-27T10:00:00Z'),
      row('b', '2026-10-27T20:00:00Z'),
    ]);
    const result = await getSchedule({ now: NOW });
    expect(result.days).toHaveLength(1);
    expect(result.days[0]?.items).toHaveLength(2);
  });
});

describe('getUpcomingEpisodes', () => {
  it('janela de 48h sobre o horário legendado (airingAt + delay)', async () => {
    const now = new Date('2026-10-26T12:00:00Z');
    await getUpcomingEpisodes(48, now);
    expect(db.prisma.airingEpisode.findMany.mock.calls[0]?.[0].where.airingAt).toEqual({
      gte: new Date('2026-10-26T11:00:00Z'),
      lte: new Date('2026-10-28T11:00:00Z'),
    });
  });
});

describe('getDashboardStats', () => {
  it('consolida contagens, próximos episódios e status de execução', async () => {
    db.prisma.user.count.mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    db.prisma.anime.count.mockResolvedValue(7);
    db.prisma.setting.findMany.mockResolvedValue([
      { key: 'lastSyncAt', value: '2026-10-26T11:00:00.000Z' },
    ]);
    db.prisma.airingEpisode.findMany.mockResolvedValue([row('a', '2026-10-26T13:00:00Z')]);

    const stats = await getDashboardStats(new Date('2026-10-26T12:00:00Z'));

    expect(stats).toMatchObject({
      activeUsersCount: 2,
      totalUsersCount: 3,
      trackedAnimesCount: 7,
      lastSyncAt: new Date('2026-10-26T11:00:00.000Z'),
      lastNotificationAt: null,
    });
    expect(stats.upcomingEpisodes48h).toHaveLength(1);
  });
});
