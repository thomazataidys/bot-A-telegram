import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, ListStatus, prisma } from './index.js';

describe('@animebot/db', () => {
  it('expõe os settings padrão da seção 4 do plano', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      groupChatId: '',
      notificationDelayMinutes: '60',
      syncIntervalMinutes: '30',
      timezone: 'America/Fortaleza',
      autoApproveUsers: 'true',
    });
  });

  it('expõe o enum ListStatus', () => {
    expect(Object.values(ListStatus).sort()).toEqual(['ASSISTINDO', 'COMPLETO', 'QUERO_VER']);
  });

  it('exporta um client singleton', async () => {
    const again = (await import('./index.js')).prisma;
    expect(again).toBe(prisma);
  });
});
