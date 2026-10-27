import type {
  CoreGlobalAnimeItem,
  CoreGroupedUserList,
  CoreScheduleItem,
  CoreScheduleResult,
  CoreUserWithStats,
  DbUser,
  GlobalAnimeItem,
  GroupedUserList,
  ScheduleItem,
  ScheduleResult,
  User,
  UserWithStats,
} from '@/types/contracts';

/**
 * Converte campos BigInt (telegramId) em string antes de enviar dados de Server Components
 * para Client Components no Next.js App Router, e filtra watchers inativos na agenda/dashboard.
 */
export function serializeUser(user: DbUser): User {
  return {
    ...user,
    telegramId: user.telegramId !== null ? user.telegramId.toString() : null,
  };
}

export function serializeUserWithStats(user: CoreUserWithStats): UserWithStats {
  return {
    ...user,
    telegramId: user.telegramId !== null ? user.telegramId.toString() : null,
  };
}

export function serializeGroupedUserList(
  list: CoreGroupedUserList,
): GroupedUserList {
  return {
    ...list,
    user: serializeUser(list.user),
  };
}

export function serializeGlobalAnimeItem(
  item: CoreGlobalAnimeItem,
): GlobalAnimeItem {
  return {
    ...item,
    watchers: item.watchers
      .filter((w) => w.user.active)
      .map((w) => ({
        ...w,
        user: {
          ...w.user,
          telegramId:
            w.user.telegramId !== null ? w.user.telegramId.toString() : null,
        },
      })),
  };
}

export function serializeScheduleItem(item: CoreScheduleItem): ScheduleItem {
  return {
    ...item,
    watchers: item.watchers
      .filter((w) => w.user.active)
      .map((w) => ({
        ...w,
        user: {
          ...w.user,
          telegramId:
            w.user.telegramId !== null ? w.user.telegramId.toString() : null,
        },
      })),
  };
}

export function serializeScheduleResult(
  schedule: CoreScheduleResult,
): ScheduleResult {
  return {
    ...schedule,
    days: schedule.days.map((day) => ({
      ...day,
      items: day.items.map(serializeScheduleItem),
    })),
    items: schedule.items.map(serializeScheduleItem),
  };
}
