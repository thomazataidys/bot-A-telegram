import { prisma } from '@animebot/db';

/** Chaves internas na tabela Setting (fora de SettingKey, então não aparecem em AppSettings). */
const LAST_SYNC_KEY = 'lastSyncAt';
const LAST_NOTIFICATION_KEY = 'lastNotificationAt';

export interface RuntimeStatus {
  lastSyncAt: Date | null;
  lastNotificationAt: Date | null;
}

async function record(key: string, at: Date): Promise<void> {
  const value = at.toISOString();
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export function recordSyncFinished(at: Date): Promise<void> {
  return record(LAST_SYNC_KEY, at);
}

export function recordNotificationSent(at: Date): Promise<void> {
  return record(LAST_NOTIFICATION_KEY, at);
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Quando ocorreram o último sync concluído e a última notificação enviada (para o painel). */
export async function getRuntimeStatus(): Promise<RuntimeStatus> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [LAST_SYNC_KEY, LAST_NOTIFICATION_KEY] } },
  });
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  return {
    lastSyncAt: parseDate(byKey.get(LAST_SYNC_KEY)),
    lastNotificationAt: parseDate(byKey.get(LAST_NOTIFICATION_KEY)),
  };
}
