import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@animebot/db';

const db = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock('@animebot/db', () => db);
const settings = vi.hoisted(() => ({ getSettings: vi.fn() }));
vi.mock('../settings.js', () => settings);

import { DuplicateUsernameError } from '../../errors.js';
import { createUserFromPanel, listUsersWithStats, upsertTelegramUser } from '../users.js';

const baseUser: User = {
  id: 'u1',
  telegramId: null,
  username: null,
  name: 'Fulano',
  active: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

beforeEach(() => {
  vi.clearAllMocks();
  settings.getSettings.mockResolvedValue({ autoApproveUsers: true });
  db.prisma.user.findUnique.mockResolvedValue(null);
  db.prisma.user.create.mockImplementation(({ data }: { data: Partial<User> }) =>
    Promise.resolve({ ...baseUser, ...data }),
  );
  db.prisma.user.update.mockImplementation(
    ({ where, data }: { where: { id: string }; data: Partial<User> }) =>
      Promise.resolve({ ...baseUser, id: where.id, ...data }),
  );
});

describe('upsertTelegramUser', () => {
  it('cria usuário ativo quando autoApproveUsers = true', async () => {
    const { user, isNew } = await upsertTelegramUser({
      telegramId: 10n,
      username: '@Thomaz',
      name: 'Thomaz',
    });
    expect(isNew).toBe(true);
    expect(user.active).toBe(true);
    expect(db.prisma.user.create).toHaveBeenCalledWith({
      data: { telegramId: 10n, username: 'thomaz', name: 'Thomaz', active: true },
    });
  });

  it('cria usuário inativo quando autoApproveUsers = false', async () => {
    settings.getSettings.mockResolvedValue({ autoApproveUsers: false });
    const { user, isNew } = await upsertTelegramUser({ telegramId: 10n, name: 'Thomaz' });
    expect(isNew).toBe(true);
    expect(user.active).toBe(false);
  });

  it('vincula o telegramId a usuário pré-cadastrado pelo painel (por username)', async () => {
    const preRegistered = { ...baseUser, id: 'u-luiz', username: 'luiz' };
    db.prisma.user.findUnique.mockImplementation(
      ({ where }: { where: { telegramId?: bigint; username?: string } }) =>
        Promise.resolve(where.username === 'luiz' ? preRegistered : null),
    );

    const { user, isNew } = await upsertTelegramUser({
      telegramId: 20n,
      username: 'Luiz',
      name: 'Luiz',
    });

    expect(isNew).toBe(false);
    expect(db.prisma.user.create).not.toHaveBeenCalled();
    expect(db.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u-luiz' },
      data: { telegramId: 20n },
    });
    expect(user.telegramId).toBe(20n);
  });

  it('atualiza nome e username quando mudaram no Telegram', async () => {
    const existing = { ...baseUser, telegramId: 30n, username: 'antigo', name: 'Antigo' };
    db.prisma.user.findUnique.mockImplementation(({ where }: { where: { telegramId?: bigint } }) =>
      Promise.resolve(where.telegramId === 30n ? existing : null),
    );

    const { user, isNew } = await upsertTelegramUser({
      telegramId: 30n,
      username: 'novo',
      name: 'Novo',
    });

    expect(isNew).toBe(false);
    expect(user).toMatchObject({ name: 'Novo', username: 'novo' });
  });

  it('não escreve nada quando nada mudou', async () => {
    const existing = { ...baseUser, telegramId: 30n, username: 'igual', name: 'Igual' };
    db.prisma.user.findUnique.mockResolvedValue(existing);
    const { user } = await upsertTelegramUser({
      telegramId: 30n,
      username: 'igual',
      name: 'Igual',
    });
    expect(user).toBe(existing);
    expect(db.prisma.user.update).not.toHaveBeenCalled();
  });

  it('cria sem username quando o @ já pertence a outra conta do Telegram', async () => {
    db.prisma.user.findUnique.mockImplementation(({ where }: { where: { username?: string } }) =>
      Promise.resolve(
        where.username ? { ...baseUser, telegramId: 99n, username: where.username } : null,
      ),
    );
    await upsertTelegramUser({ telegramId: 40n, username: 'ocupado', name: 'Novo' });
    expect(db.prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ username: null }),
    });
  });
});

describe('createUserFromPanel', () => {
  it('normaliza @Username para minúsculas sem @', async () => {
    const user = await createUserFromPanel({ name: ' Luiz ', username: '@LuIz' });
    expect(user.username).toBe('luiz');
    expect(db.prisma.user.create).toHaveBeenCalledWith({
      data: { name: 'Luiz', username: 'luiz', active: true },
    });
  });

  it('lança DuplicateUsernameError se o username já existe', async () => {
    db.prisma.user.findUnique.mockResolvedValue({ ...baseUser, username: 'luiz' });
    await expect(createUserFromPanel({ name: 'Outro', username: '@Luiz' })).rejects.toBeInstanceOf(
      DuplicateUsernameError,
    );
    expect(db.prisma.user.create).not.toHaveBeenCalled();
  });

  it('converte violação de unicidade (corrida) em DuplicateUsernameError', async () => {
    db.prisma.user.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(createUserFromPanel({ name: 'X', username: 'x' })).rejects.toBeInstanceOf(
      DuplicateUsernameError,
    );
  });
});

describe('listUsersWithStats', () => {
  it('calcula contagem e estado de registro', async () => {
    db.prisma.user.findMany.mockResolvedValue([
      { ...baseUser, id: 'a', telegramId: 1n, _count: { entries: 3 } },
      { ...baseUser, id: 'b', telegramId: 2n, active: false, _count: { entries: 0 } },
      { ...baseUser, id: 'c', telegramId: null, _count: { entries: 1 } },
    ]);
    const result = await listUsersWithStats();
    expect(result.map((u) => [u.entriesCount, u.registrationState])).toEqual([
      [3, 'ACTIVE'],
      [0, 'PENDING_APPROVAL'],
      [1, 'NEVER_STARTED_BOT'],
    ]);
  });
});
