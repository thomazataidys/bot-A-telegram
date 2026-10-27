import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  prisma: {
    setting: { findMany: vi.fn(), upsert: vi.fn((args: unknown) => args) },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
  DEFAULT_SETTINGS: {
    groupChatId: '',
    notificationDelayMinutes: '60',
    syncIntervalMinutes: '30',
    timezone: 'America/Fortaleza',
    autoApproveUsers: 'true',
  },
}));
vi.mock('@animebot/db', () => db);

import { getSettings, invalidateSettingsCache, setSetting, updateSettings } from '../settings.js';

beforeEach(() => {
  vi.clearAllMocks();
  invalidateSettingsCache();
  db.prisma.setting.findMany.mockResolvedValue([]);
});

describe('getSettings', () => {
  it('retorna os valores padrão quando o banco está vazio', async () => {
    expect(await getSettings()).toEqual({
      groupChatId: null,
      notificationDelayMinutes: 60,
      syncIntervalMinutes: 30,
      timezone: 'America/Fortaleza',
      autoApproveUsers: true,
    });
  });

  it('converte os valores salvos para os tipos corretos', async () => {
    db.prisma.setting.findMany.mockResolvedValue([
      { key: 'groupChatId', value: '-100123' },
      { key: 'notificationDelayMinutes', value: '90' },
      { key: 'autoApproveUsers', value: 'false' },
    ]);
    const settings = await getSettings();
    expect(settings.groupChatId).toBe('-100123');
    expect(settings.notificationDelayMinutes).toBe(90);
    expect(settings.autoApproveUsers).toBe(false);
  });

  it('usa cache: duas chamadas seguidas consultam o banco uma vez', async () => {
    await getSettings();
    await getSettings();
    expect(db.prisma.setting.findMany).toHaveBeenCalledTimes(1);
  });

  it('bypassCache força nova consulta', async () => {
    await getSettings();
    await getSettings({ bypassCache: true });
    expect(db.prisma.setting.findMany).toHaveBeenCalledTimes(2);
  });
});

describe('setSetting / updateSettings', () => {
  it('grava no banco e invalida o cache imediatamente', async () => {
    await getSettings();
    db.prisma.setting.findMany.mockResolvedValue([{ key: 'syncIntervalMinutes', value: '15' }]);

    const updated = await setSetting('syncIntervalMinutes', 15);

    expect(db.prisma.setting.upsert).toHaveBeenCalledWith({
      where: { key: 'syncIntervalMinutes' },
      create: { key: 'syncIntervalMinutes', value: '15' },
      update: { value: '15' },
    });
    expect(updated.syncIntervalMinutes).toBe(15);
    expect((await getSettings()).syncIntervalMinutes).toBe(15);
  });

  it('atualiza várias chaves numa transação e salva null como string vazia', async () => {
    await updateSettings({ groupChatId: null, autoApproveUsers: false });
    expect(db.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(db.prisma.setting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'groupChatId' }, update: { value: '' } }),
    );
    expect(db.prisma.setting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'autoApproveUsers' }, update: { value: 'false' } }),
    );
  });
});
