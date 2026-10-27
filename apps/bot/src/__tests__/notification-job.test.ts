import type { PendingNotification } from '@animebot/core';
import { describe, expect, it } from 'vitest';
import { parseAdminIds } from '../commands/config-group.js';
import { notificationKeyboard, notificationText } from '../jobs/notification-job.js';

const notification = {
  anime: { id: 'c'.repeat(25), siteUrl: 'https://anilist.co/anime/1' },
  displayTitle: 'Tom & Jerry',
  episode: 8,
  watchers: [
    { user: { id: 'u1', name: 'Ana', username: 'ana', telegramId: 1n }, progress: 7 },
    { user: { id: 'u2', name: 'Bia <3', username: null, telegramId: 22n }, progress: 0 },
  ],
} as unknown as PendingNotification;

describe('notificationText', () => {
  it('menciona por @username ou link tg://user e escapa o título', () => {
    const text = notificationText(notification);
    expect(text).toContain('<b>Tom &amp; Jerry</b> — episódio 8');
    expect(text).toContain('@ana <a href="tg://user?id=22">Bia &lt;3</a>');
  });
});

describe('notificationKeyboard', () => {
  it('tem ✅ Vi (callback ≤ 64 bytes) e 🔗 AniList', () => {
    const [row] = notificationKeyboard(notification).inline_keyboard;
    expect(row).toEqual([
      { text: '✅ Vi', callback_data: `watched:${'c'.repeat(25)}:8` },
      { text: '🔗 AniList', url: 'https://anilist.co/anime/1' },
    ]);
    const data = (row?.[0] as { callback_data: string }).callback_data;
    expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64);
  });
});

describe('parseAdminIds', () => {
  it('separa por vírgula ignorando espaços e vazios', () => {
    expect([...parseAdminIds(' 1, 22 ,,333 ')]).toEqual(['1', '22', '333']);
    expect(parseAdminIds(undefined).size).toBe(0);
  });
});
