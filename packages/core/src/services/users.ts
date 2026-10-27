import { prisma } from '@animebot/db';
import type { User } from '@animebot/db';
import { DuplicateUsernameError, UserNotFoundError } from '../errors.js';
import { normalizeUsername } from '../utils/index.js';
import { getSettings } from './settings.js';

export type UserRegistrationState = 'ACTIVE' | 'PENDING_APPROVAL' | 'NEVER_STARTED_BOT';

export interface UserWithStats extends User {
  entriesCount: number;
  registrationState: UserRegistrationState;
}

export interface UpsertTelegramUserInput {
  telegramId: bigint;
  username?: string | null;
  name: string;
}

export interface UpsertTelegramUserResult {
  user: User;
  isNew: boolean;
}

export interface CreatePanelUserInput {
  name: string;
  username?: string | null;
  active?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  username?: string | null;
  active?: boolean;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}

function registrationStateOf(user: Pick<User, 'active' | 'telegramId'>): UserRegistrationState {
  if (!user.active) return 'PENDING_APPROVAL';
  return user.telegramId === null ? 'NEVER_STARTED_BOT' : 'ACTIVE';
}

export async function upsertTelegramUser(
  input: UpsertTelegramUserInput,
): Promise<UpsertTelegramUserResult> {
  const username = normalizeUsername(input.username);
  const name = input.name;

  const byTelegramId = await prisma.user.findUnique({ where: { telegramId: input.telegramId } });
  if (byTelegramId) {
    const data: { name?: string; username?: string | null } = {};
    if (byTelegramId.name !== name) data.name = name;
    if (byTelegramId.username !== username) {
      // o @ pode ter sido de outra conta; só troca se estiver livre
      const owner = username ? await prisma.user.findUnique({ where: { username } }) : null;
      if (!owner || owner.id === byTelegramId.id) data.username = username;
    }
    if (Object.keys(data).length === 0) return { user: byTelegramId, isNew: false };
    const user = await prisma.user.update({ where: { id: byTelegramId.id }, data });
    return { user, isNew: false };
  }

  let usernameTaken = false;
  if (username) {
    const byUsername = await prisma.user.findUnique({ where: { username } });
    if (byUsername?.telegramId === null) {
      const user = await prisma.user.update({
        where: { id: byUsername.id },
        data: { telegramId: input.telegramId },
      });
      return { user, isNew: false };
    }
    usernameTaken = byUsername !== null;
  }

  const { autoApproveUsers } = await getSettings();
  const user = await prisma.user.create({
    data: {
      telegramId: input.telegramId,
      username: usernameTaken ? null : username,
      name,
      active: autoApproveUsers,
    },
  });
  return { user, isNew: true };
}

export async function listUsersWithStats(): Promise<UserWithStats[]> {
  const users = await prisma.user.findMany({
    include: { _count: { select: { entries: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return users.map(({ _count, ...user }) => ({
    ...user,
    entriesCount: _count.entries,
    registrationState: registrationStateOf(user),
  }));
}

export async function getUserById(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UserNotFoundError(userId);
  return user;
}

export async function getUserByUsername(username: string): Promise<User> {
  const normalized = normalizeUsername(username);
  const user = normalized
    ? await prisma.user.findUnique({ where: { username: normalized } })
    : null;
  if (!user) throw new UserNotFoundError(username);
  return user;
}

export async function createUserFromPanel(input: CreatePanelUserInput): Promise<User> {
  const username = normalizeUsername(input.username);
  if (username && (await prisma.user.findUnique({ where: { username } }))) {
    throw new DuplicateUsernameError(username);
  }
  try {
    return await prisma.user.create({
      data: { name: input.name.trim(), username, active: input.active ?? true },
    });
  } catch (error) {
    if (username && isUniqueViolation(error)) throw new DuplicateUsernameError(username);
    throw error;
  }
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<User> {
  await getUserById(userId);
  const data: { name?: string; username?: string | null; active?: boolean } = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.active !== undefined) data.active = input.active;
  if (input.username !== undefined) {
    const username = normalizeUsername(input.username);
    if (username) {
      const owner = await prisma.user.findUnique({ where: { username } });
      if (owner && owner.id !== userId) throw new DuplicateUsernameError(username);
    }
    data.username = username;
  }
  try {
    return await prisma.user.update({ where: { id: userId }, data });
  } catch (error) {
    if (data.username && isUniqueViolation(error)) throw new DuplicateUsernameError(data.username);
    throw error;
  }
}

export function setUserActive(userId: string, active: boolean): Promise<User> {
  return updateUser(userId, { active });
}

export async function deleteUser(userId: string): Promise<void> {
  await getUserById(userId);
  await prisma.user.delete({ where: { id: userId } });
}
