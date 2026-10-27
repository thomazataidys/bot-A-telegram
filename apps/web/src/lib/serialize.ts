import type {
  CoreGlobalAnimeItem,
  CoreGroupedUserList,
  CoreUserWithStats,
  DbUser,
  GlobalAnimeItem,
  GroupedUserList,
  User,
  UserWithStats,
} from '@/types/contracts';

/**
 * Converte campos BigInt (telegramId) em string antes de enviar dados de Server Components
 * para Client Components no Next.js App Router.
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
    watchers: item.watchers.map((w) => ({
      ...w,
      user: {
        ...w.user,
        telegramId:
          w.user.telegramId !== null ? w.user.telegramId.toString() : null,
      },
    })),
  };
}
