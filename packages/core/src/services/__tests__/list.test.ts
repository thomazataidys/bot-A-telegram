import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn() },
    anime: { findUnique: vi.fn(), findFirst: vi.fn() },
    listEntry: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock('@animebot/db', () => db);
const anilist = vi.hoisted(() => ({ getAnimeByMalId: vi.fn() }));
vi.mock('../../anilist/index.js', () => anilist);
const sync = vi.hoisted(() => ({ syncSingleAnime: vi.fn() }));
vi.mock('../sync.js', () => sync);
const users = vi.hoisted(() => ({ getUserByUsername: vi.fn() }));
vi.mock('../users.js', () => users);

import {
  AnimeAlreadyInListError,
  AnimeNotFoundError,
  EntryNotFoundError,
  UnauthorizedEntryAccessError,
  UserNotFoundError,
} from '../../errors.js';
import {
  addAnimeByAnilistId,
  addAnimeByMalId,
  findUserEntriesByTitle,
  getGlobalList,
  getUserList,
  getUserListByUsername,
  removeEntry,
} from '../list.js';

const user = (id: string) => ({ id, name: id, username: id, telegramId: null, active: true });
const anime = (id: string, anilistId: number, romaji: string, english: string | null = null) => ({
  id,
  anilistId,
  malId: null,
  titleEnglish: english,
  titleRomaji: romaji,
  coverUrl: null,
  siteUrl: `https://anilist.co/anime/${anilistId}`,
  format: 'TV',
  status: 'RELEASING',
  totalEpisodes: 12,
  lastSyncedAt: null,
});
const rawEntry = (
  id: string,
  userId: string,
  a: ReturnType<typeof anime>,
  status = 'ASSISTINDO',
) => ({
  id,
  userId,
  animeId: a.id,
  status,
  progress: 0,
  addedAt: new Date(0),
  updatedAt: new Date(0),
  anime: { ...a, episodes: [] as unknown[] },
});

const solo = anime('a1', 100, 'Ore dake Level Up na Ken', 'Solo Leveling');

beforeEach(() => {
  vi.clearAllMocks();
  db.prisma.user.findUnique.mockResolvedValue(user('u1'));
  db.prisma.anime.findUnique.mockResolvedValue(null);
  db.prisma.anime.findFirst.mockResolvedValue(null);
  db.prisma.listEntry.findUnique.mockResolvedValue(null);
  db.prisma.listEntry.create.mockImplementation(
    ({ data }: { data: { userId: string; status: string; progress: number } }) =>
      Promise.resolve({
        ...rawEntry('e1', data.userId, solo),
        status: data.status,
        progress: data.progress,
      }),
  );
  sync.syncSingleAnime.mockResolvedValue(solo);
});

describe('addAnimeByAnilistId', () => {
  it('sincroniza anime novo e cria a entrada ASSISTINDO com progress 0', async () => {
    const entry = await addAnimeByAnilistId(100, { userId: 'u1' });

    expect(sync.syncSingleAnime).toHaveBeenCalledWith(100);
    expect(db.prisma.listEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: 'u1', animeId: 'a1', status: 'ASSISTINDO', progress: 0 },
      }),
    );
    expect(entry.status).toBe('ASSISTINDO');
    expect(entry.progress).toBe(0);
    expect(entry.anime.nextEpisode).toBeNull();
  });

  it('não sincroniza de novo se o anime já está no banco', async () => {
    db.prisma.anime.findUnique.mockResolvedValue(solo);
    await addAnimeByAnilistId(100, { userId: 'u1', status: 'QUERO_VER' });
    expect(sync.syncSingleAnime).not.toHaveBeenCalled();
    expect(db.prisma.listEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'QUERO_VER' }) }),
    );
  });

  it('lança AnimeAlreadyInListError com a entrada existente', async () => {
    db.prisma.anime.findUnique.mockResolvedValue(solo);
    db.prisma.listEntry.findUnique.mockResolvedValue(rawEntry('e-old', 'u1', solo));

    const error = await addAnimeByAnilistId(100, { userId: 'u1' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AnimeAlreadyInListError);
    expect((error as AnimeAlreadyInListError).entry.id).toBe('e-old');
    expect(db.prisma.listEntry.create).not.toHaveBeenCalled();
  });

  it('lança UserNotFoundError para usuário inexistente', async () => {
    db.prisma.user.findUnique.mockResolvedValue(null);
    await expect(addAnimeByAnilistId(100, { userId: 'x' })).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });

  it('propaga AnimeNotFoundError do sync', async () => {
    sync.syncSingleAnime.mockRejectedValue(new AnimeNotFoundError(100));
    await expect(addAnimeByAnilistId(100, { userId: 'u1' })).rejects.toBeInstanceOf(
      AnimeNotFoundError,
    );
  });
});

describe('addAnimeByMalId', () => {
  it('resolve o id da AniList pelo MAL e adiciona', async () => {
    anilist.getAnimeByMalId.mockResolvedValue({ id: 100 });
    await addAnimeByMalId(52299, { userId: 'u1' });
    expect(sync.syncSingleAnime).toHaveBeenCalledWith(100);
  });

  it('lança AnimeNotFoundError quando o MAL id não existe na AniList', async () => {
    anilist.getAnimeByMalId.mockResolvedValue(null);
    await expect(addAnimeByMalId(1, { userId: 'u1' })).rejects.toBeInstanceOf(AnimeNotFoundError);
  });
});

describe('getUserList', () => {
  it('traz só as entradas do usuário, agrupadas por status e ordenadas por título', async () => {
    const frieren = anime('a2', 200, 'Sousou no Frieren', 'Frieren');
    db.prisma.listEntry.findMany.mockResolvedValue([
      rawEntry('e1', 'u1', solo, 'COMPLETO'),
      rawEntry('e2', 'u1', frieren, 'ASSISTINDO'),
    ]);

    const list = await getUserList('u1');

    expect(db.prisma.listEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
    expect(list.ASSISTINDO.map((e) => e.id)).toEqual(['e2']);
    expect(list.COMPLETO.map((e) => e.id)).toEqual(['e1']);
    expect(list.QUERO_VER).toEqual([]);
    expect(list.totalCount).toBe(2);
  });

  it('expõe o próximo episódio como anime.nextEpisode', async () => {
    const episode = {
      id: 'ep',
      animeId: 'a1',
      episode: 5,
      airingAt: new Date(1),
      notifiedAt: null,
    };
    const raw = rawEntry('e1', 'u1', solo);
    raw.anime.episodes = [episode];
    db.prisma.listEntry.findMany.mockResolvedValue([raw]);
    const list = await getUserList('u1');
    expect(list.ASSISTINDO[0]?.anime.nextEpisode).toEqual(episode);
    expect(list.ASSISTINDO[0]?.anime).not.toHaveProperty('episodes');
  });
});

describe('getUserListByUsername', () => {
  it('resolve o @username e devolve a lista do usuário', async () => {
    users.getUserByUsername.mockResolvedValue(user('u2'));
    db.prisma.user.findUnique.mockResolvedValue(user('u2'));
    db.prisma.listEntry.findMany.mockResolvedValue([rawEntry('e9', 'u2', solo)]);

    const list = await getUserListByUsername('@Luiz');

    expect(users.getUserByUsername).toHaveBeenCalledWith('@Luiz');
    expect(list.user.id).toBe('u2');
    expect(list.ASSISTINDO.map((e) => e.id)).toEqual(['e9']);
  });

  it('propaga UserNotFoundError', async () => {
    users.getUserByUsername.mockRejectedValue(new UserNotFoundError('x'));
    await expect(getUserListByUsername('x')).rejects.toBeInstanceOf(UserNotFoundError);
  });
});

describe('getGlobalList', () => {
  it('agrega vários usuários no mesmo anime e ordena por título', async () => {
    const frieren = anime('a2', 200, 'Sousou no Frieren', 'Frieren');
    const withUser = (
      id: string,
      u: string,
      name: string,
      a: ReturnType<typeof anime>,
      progress: number,
    ) => ({
      ...rawEntry(id, u, a),
      progress,
      user: { ...user(u), name },
    });
    db.prisma.listEntry.findMany.mockResolvedValue([
      withUser('e1', 'u2', 'Thomaz', solo, 5),
      withUser('e2', 'u3', 'Ana', solo, 3),
      withUser('e3', 'u2', 'Thomaz', frieren, 1),
    ]);

    const items = await getGlobalList();

    expect(items.map((i) => i.displayTitle)).toEqual(['Frieren', 'Solo Leveling']);
    const soloItem = items[1];
    expect(soloItem?.watchers.map((w) => [w.user.name, w.progress])).toEqual([
      ['Ana', 3],
      ['Thomaz', 5],
    ]);
    expect(soloItem?.nextEpisode).toBeNull();
    expect(soloItem?.anime).not.toHaveProperty('nextEpisode');
  });

  it('traduz os filtros para a consulta', async () => {
    db.prisma.listEntry.findMany.mockResolvedValue([]);
    await getGlobalList({
      userId: 'u1',
      listStatus: 'COMPLETO',
      animeStatus: 'RELEASING',
      search: ' solo ',
    });
    const args = db.prisma.listEntry.findMany.mock.calls[0]?.[0] as { where: unknown };
    expect(args.where).toEqual({
      userId: 'u1',
      status: 'COMPLETO',
      anime: {
        status: 'RELEASING',
        OR: [
          { titleEnglish: { contains: 'solo', mode: 'insensitive' } },
          { titleRomaji: { contains: 'solo', mode: 'insensitive' } },
        ],
      },
    });
  });
});

describe('findUserEntriesByTitle', () => {
  const frieren = anime('a2', 200, 'Sousou no Frieren', 'Frieren: Beyond Journey’s End');
  const frierenS2 = anime('a3', 300, 'Frieren S2');

  beforeEach(() => {
    db.prisma.listEntry.findMany.mockResolvedValue([
      rawEntry('e1', 'u1', solo),
      rawEntry('e2', 'u1', frieren),
      rawEntry('e3', 'u1', frierenS2),
    ]);
  });

  it('casa por substring em qualquer título, ignorando acento e caixa', async () => {
    const result = await findUserEntriesByTitle('u1', 'SOLO');
    expect(result.map((e) => e.id)).toEqual(['e1']);
    expect((await findUserEntriesByTitle('u1', 'ore dake')).map((e) => e.id)).toEqual(['e1']);
  });

  it('coloca match exato primeiro e devolve vazio quando nada casa', async () => {
    expect((await findUserEntriesByTitle('u1', 'frieren s2')).map((e) => e.id)).toEqual(['e3']);
    expect((await findUserEntriesByTitle('u1', 'frieren')).map((e) => e.id)).toHaveLength(2);
    expect(await findUserEntriesByTitle('u1', 'naruto')).toEqual([]);
    expect(await findUserEntriesByTitle('u1', '   ')).toEqual([]);
  });
});

describe('removeEntry', () => {
  beforeEach(() => {
    db.prisma.listEntry.findUnique.mockResolvedValue(rawEntry('e1', 'u1', solo));
  });

  it('remove quando chamado pelo dono', async () => {
    const removed = await removeEntry('e1', 'u1');
    expect(removed.id).toBe('e1');
    expect(db.prisma.listEntry.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
  });

  it('remove sem actorUserId (painel)', async () => {
    await removeEntry('e1');
    expect(db.prisma.listEntry.delete).toHaveBeenCalled();
  });

  it('lança UnauthorizedEntryAccessError para outro usuário e não remove', async () => {
    await expect(removeEntry('e1', 'u2')).rejects.toBeInstanceOf(UnauthorizedEntryAccessError);
    expect(db.prisma.listEntry.delete).not.toHaveBeenCalled();
  });

  it('lança EntryNotFoundError quando não existe', async () => {
    db.prisma.listEntry.findUnique.mockResolvedValue(null);
    await expect(removeEntry('nope', 'u1')).rejects.toBeInstanceOf(EntryNotFoundError);
  });
});
