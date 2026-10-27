import { DEFAULT_SETTINGS, prisma } from '@animebot/db';
import type { SettingKey } from '@animebot/db';

export interface AppSettings {
  groupChatId: string | null;
  notificationDelayMinutes: number;
  syncIntervalMinutes: number;
  timezone: string;
  autoApproveUsers: boolean;
}

export type PartialAppSettingsInput = Partial<AppSettings>;

const CACHE_TTL_MS = 30_000;

let cache: { value: AppSettings; expiresAt: number } | null = null;

function parseNumber(raw: string, fallback: string): number {
  const value = Number(raw);
  return raw.trim() !== '' && Number.isFinite(value) ? value : Number(fallback);
}

function parseSettings(rows: { key: string; value: string }[]): AppSettings {
  const raw: Record<SettingKey, string> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in raw) raw[row.key as SettingKey] = row.value;
  }
  return {
    groupChatId: raw.groupChatId.trim() === '' ? null : raw.groupChatId.trim(),
    notificationDelayMinutes: parseNumber(
      raw.notificationDelayMinutes,
      DEFAULT_SETTINGS.notificationDelayMinutes,
    ),
    syncIntervalMinutes: parseNumber(raw.syncIntervalMinutes, DEFAULT_SETTINGS.syncIntervalMinutes),
    timezone: raw.timezone.trim() === '' ? DEFAULT_SETTINGS.timezone : raw.timezone.trim(),
    autoApproveUsers: raw.autoApproveUsers.trim().toLowerCase() === 'true',
  };
}

function serialize<K extends SettingKey>(key: K, value: AppSettings[K]): string {
  if (value === null) return '';
  return String(value);
}

export async function getSettings(options: { bypassCache?: boolean } = {}): Promise<AppSettings> {
  const now = Date.now();
  if (!options.bypassCache && cache && cache.expiresAt > now) return cache.value;
  const rows = await prisma.setting.findMany();
  const value = parseSettings(rows);
  cache = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}

export function invalidateSettingsCache(): void {
  cache = null;
}

export async function updateSettings(input: PartialAppSettingsInput): Promise<AppSettings> {
  const entries = (Object.entries(input) as [SettingKey, AppSettings[SettingKey] | undefined][])
    .filter(([key, value]) => value !== undefined && key in DEFAULT_SETTINGS)
    .map(([key, value]) => ({ key, value: serialize(key, value as never) }));

  if (entries.length > 0) {
    await prisma.$transaction(
      entries.map(({ key, value }) =>
        prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } }),
      ),
    );
  }
  invalidateSettingsCache();
  return getSettings({ bypassCache: true });
}

export function setSetting<K extends SettingKey>(
  key: K,
  value: AppSettings[K],
): Promise<AppSettings> {
  return updateSettings({ [key]: value } as PartialAppSettingsInput);
}
