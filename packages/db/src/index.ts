import { PrismaPg } from '@prisma/adapter-pg';
import { ListStatus, Prisma, PrismaClient } from '@prisma/client';
import type { AiringEpisode, Anime, ListEntry, Setting, User } from '@prisma/client';

export type SettingKey =
  | 'groupChatId'
  | 'notificationDelayMinutes'
  | 'syncIntervalMinutes'
  | 'timezone'
  | 'autoApproveUsers';

export const DEFAULT_SETTINGS: Readonly<Record<SettingKey, string>> = {
  groupChatId: '',
  notificationDelayMinutes: '60',
  syncIntervalMinutes: '30',
  timezone: 'America/Fortaleza',
  autoApproveUsers: 'true',
};

const globalForPrisma = globalThis as unknown as { __animebotPrisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.__animebotPrisma ?? createClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.__animebotPrisma = prisma;
}

export { PrismaClient, Prisma, ListStatus };
export type { User, Anime, ListEntry, AiringEpisode, Setting };
