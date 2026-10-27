import { describe, expect, it } from 'vitest';
import {
  formatRelativeTimeBR,
  getAnimeDisplayTitle,
  settingsFormSchema,
} from '../../types/contracts';
import {
  serializeGlobalAnimeItem,
  serializeScheduleItem,
  serializeUserWithStats,
} from '../serialize';

describe('contracts & settings schema', () => {
  it('prefers titleEnglish when available and falls back to titleRomaji', () => {
    expect(
      getAnimeDisplayTitle({
        titleEnglish: 'Solo Leveling',
        titleRomaji: 'Ore dake Level Up na Ken',
      }),
    ).toBe('Solo Leveling');

    expect(
      getAnimeDisplayTitle({
        titleEnglish: null,
        titleRomaji: 'Sousou no Frieren',
      }),
    ).toBe('Sousou no Frieren');
  });

  it('validates settingsFormSchema properly', () => {
    const valid = settingsFormSchema.safeParse({
      groupChatId: '-1001234567890',
      notificationDelayMinutes: '60',
      syncIntervalMinutes: '30',
      timezone: 'America/Fortaleza',
      autoApproveUsers: true,
    });
    expect(valid.success).toBe(true);

    const invalidChatId = settingsFormSchema.safeParse({
      groupChatId: 'invalid-id',
      notificationDelayMinutes: 60,
      syncIntervalMinutes: 30,
      timezone: 'America/Fortaleza',
      autoApproveUsers: true,
    });
    expect(invalidChatId.success).toBe(false);
  });

  it('serializes BigInt telegramId to string for Client Components', () => {
    const now = new Date();
    const serialized = serializeUserWithStats({
      id: 'u1',
      telegramId: 9876543210n,
      username: 'thomaz',
      name: 'Thomaz',
      active: true,
      createdAt: now,
      updatedAt: now,
      entriesCount: 2,
      registrationState: 'ACTIVE',
    });

    expect(serialized.telegramId).toBe('9876543210');
    expect(() => JSON.stringify(serialized)).not.toThrow();
  });

  it('formats relative time in PT-BR', () => {
    const now = new Date('2026-10-26T21:00:00.000Z');
    expect(formatRelativeTimeBR(null, now)).toBe('Nunca');
    expect(
      formatRelativeTimeBR(new Date('2026-10-26T20:59:30.000Z'), now),
    ).toBe('Agora mesmo');
    expect(
      formatRelativeTimeBR(new Date('2026-10-26T20:45:00.000Z'), now),
    ).toBe('Há 15 min');
    expect(
      formatRelativeTimeBR(new Date('2026-10-26T19:00:00.000Z'), now),
    ).toBe('Há 2 horas');
  });

  it('filters out inactive watchers in serializeScheduleItem', () => {
    const now = new Date();
    const item = serializeScheduleItem({
      airingEpisode: {
        id: 'ep1',
        animeId: 'a1',
        episode: 1,
        airingAt: now,
        notifiedAt: null,
      },
      anime: {
        id: 'a1',
        anilistId: 1,
        malId: null,
        titleEnglish: 'Solo Leveling',
        titleRomaji: 'Ore dake Level Up na Ken',
        coverUrl: null,
        siteUrl: 'https://anilist.co/anime/1',
        format: 'TV',
        status: 'RELEASING',
        totalEpisodes: 12,
        lastSyncedAt: now,
      },
      displayTitle: 'Solo Leveling',
      episode: 1,
      japanAiringAt: now,
      subbedAiringAt: now,
      formattedTime: '13:30',
      formattedDayHeader: 'Segunda, 26/10',
      dayKey: '2026-10-26',
      watchers: [
        {
          user: {
            id: 'u-active',
            name: 'Thomaz',
            username: 'thomaz',
            telegramId: 100n,
            active: true,
          },
          entryId: 'e1',
          status: 'ASSISTINDO',
          progress: 1,
        },
        {
          user: {
            id: 'u-inactive',
            name: 'Inativo',
            username: 'inativo',
            telegramId: 200n,
            active: false,
          },
          entryId: 'e2',
          status: 'ASSISTINDO',
          progress: 0,
        },
      ],
    });

    expect(item.watchers).toHaveLength(1);
    expect(item.watchers[0]?.user.id).toBe('u-active');
    expect(item.watchers[0]?.user.telegramId).toBe('100');
  });

  it('filters out inactive watchers in serializeGlobalAnimeItem', () => {
    const now = new Date();
    const item = serializeGlobalAnimeItem({
      anime: {
        id: 'a1',
        anilistId: 1,
        malId: null,
        titleEnglish: 'Solo Leveling',
        titleRomaji: 'Ore dake Level Up na Ken',
        coverUrl: null,
        siteUrl: 'https://anilist.co/anime/1',
        format: 'TV',
        status: 'RELEASING',
        totalEpisodes: 12,
        lastSyncedAt: now,
      },
      displayTitle: 'Solo Leveling',
      nextEpisode: null,
      watchers: [
        {
          user: {
            id: 'u-active',
            name: 'Thomaz',
            username: 'thomaz',
            telegramId: 100n,
            active: true,
          },
          entryId: 'e1',
          status: 'ASSISTINDO',
          progress: 5,
        },
        {
          user: {
            id: 'u-inactive',
            name: 'Inativo',
            username: 'inativo',
            telegramId: 200n,
            active: false,
          },
          entryId: 'e2',
          status: 'ASSISTINDO',
          progress: 1,
        },
      ],
    });

    expect(item.watchers).toHaveLength(1);
    expect(item.watchers[0]?.user.id).toBe('u-active');
    expect(item.watchers[0]?.user.telegramId).toBe('100');
  });
});
