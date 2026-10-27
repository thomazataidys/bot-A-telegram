import { describe, expect, it } from 'vitest';
import {
  getAnimeDisplayTitle,
  settingsFormSchema,
} from '../../types/contracts';

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
});
