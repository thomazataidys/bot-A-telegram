import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  prisma: { listEntry: { update: vi.fn(), findUnique: vi.fn() } },
}));
vi.mock('@animebot/db', () => db);
const list = vi.hoisted(() => ({ getEntryById: vi.fn(), findUserEntriesByTitle: vi.fn() }));
vi.mock('../list.js', () => list);

import {
  AmbiguousEntryMatchError,
  EntryNotFoundError,
  InvalidEpisodeNumberError,
  UnauthorizedEntryAccessError,
} from '../../errors.js';
import {
  incrementProgress,
  markEpisodeWatched,
  setProgress,
  setProgressByTitle,
  setStatus,
} from '../progress.js';

interface FakeEntry {
  id: string;
  userId: string;
  status: string;
  progress: number;
  anime: { titleEnglish: string | null; titleRomaji: string; totalEpisodes: number | null };
}

const fake = (
  id: string,
  title: string,
  overrides: Partial<Pick<FakeEntry, 'progress' | 'status' | 'userId'>> = {},
  totalEpisodes: number | null = 12,
): FakeEntry => ({
  id,
  userId: 'u1',
  status: 'ASSISTINDO',
  progress: 0,
  anime: { titleEnglish: title, titleRomaji: `${title} (romaji)`, totalEpisodes },
  ...overrides,
});

/** Estado em memória: update altera a entrada que getEntryById devolve em seguida. */
let store: Map<string, FakeEntry>;
function seed(...entries: FakeEntry[]): void {
  store = new Map(entries.map((e) => [e.id, e]));
}

beforeEach(() => {
  vi.clearAllMocks();
  seed(fake('e1', 'Solo Leveling'));
  list.getEntryById.mockImplementation((id: string) => {
    const entry = store.get(id);
    return entry ? Promise.resolve({ ...entry }) : Promise.reject(new EntryNotFoundError(id));
  });
  db.prisma.listEntry.update.mockImplementation(
    ({ where, data }: { where: { id: string }; data: Partial<FakeEntry> }) => {
      const entry = store.get(where.id);
      if (entry) Object.assign(entry, data);
      return Promise.resolve(entry);
    },
  );
});

describe('incrementProgress', () => {
  it('soma 1 episódio sem sinalizar fim', async () => {
    const result = await incrementProgress('e1', 'u1');
    expect(result.entry.progress).toBe(1);
    expect(result.reachedTotalEpisodes).toBe(false);
  });

  it('sinaliza reachedTotalEpisodes ao atingir o total e não passa dele', async () => {
    seed(fake('e1', 'Solo Leveling', { progress: 11 }));
    const reached = await incrementProgress('e1', 'u1');
    expect(reached.entry.progress).toBe(12);
    expect(reached.reachedTotalEpisodes).toBe(true);

    const again = await incrementProgress('e1', 'u1');
    expect(again.entry.progress).toBe(12);
  });

  it('não sinaliza quando já está COMPLETO', async () => {
    seed(fake('e1', 'Solo Leveling', { progress: 11, status: 'COMPLETO' }));
    expect((await incrementProgress('e1', 'u1')).reachedTotalEpisodes).toBe(false);
  });

  it('não tem limite com total desconhecido', async () => {
    seed(fake('e1', 'Solo Leveling', { progress: 40 }, null));
    const result = await incrementProgress('e1');
    expect(result.entry.progress).toBe(41);
    expect(result.reachedTotalEpisodes).toBe(false);
  });

  it('bloqueia outro usuário sem alterar nada', async () => {
    await expect(incrementProgress('e1', 'u2')).rejects.toBeInstanceOf(
      UnauthorizedEntryAccessError,
    );
    expect(db.prisma.listEntry.update).not.toHaveBeenCalled();
  });

  it('lança EntryNotFoundError para entrada inexistente', async () => {
    await expect(incrementProgress('nope', 'u1')).rejects.toBeInstanceOf(EntryNotFoundError);
  });
});

describe('setProgress', () => {
  it('define o episódio e sinaliza o total', async () => {
    const result = await setProgress('e1', 12, 'u1');
    expect(result.entry.progress).toBe(12);
    expect(result.reachedTotalEpisodes).toBe(true);
    expect((await setProgress('e1', 0, 'u1')).entry.progress).toBe(0);
  });

  it.each([-1, 13, 1.5, Number.NaN])('rejeita o episódio inválido %s', async (episode) => {
    await expect(setProgress('e1', episode, 'u1')).rejects.toBeInstanceOf(
      InvalidEpisodeNumberError,
    );
    expect(db.prisma.listEntry.update).not.toHaveBeenCalled();
  });

  it('aceita qualquer episódio >= 0 quando o total é desconhecido', async () => {
    seed(fake('e1', 'Solo Leveling', {}, null));
    expect((await setProgress('e1', 500, 'u1')).entry.progress).toBe(500);
  });

  it('bloqueia outro usuário', async () => {
    await expect(setProgress('e1', 3, 'u2')).rejects.toBeInstanceOf(UnauthorizedEntryAccessError);
  });
});

describe('setStatus', () => {
  it('COMPLETO ajusta o progresso para o total de episódios', async () => {
    const entry = await setStatus('e1', 'COMPLETO', 'u1');
    expect(entry.status).toBe('COMPLETO');
    expect(entry.progress).toBe(12);
  });

  it('COMPLETO com total desconhecido mantém o progresso', async () => {
    seed(fake('e1', 'Solo Leveling', { progress: 7 }, null));
    expect((await setStatus('e1', 'COMPLETO', 'u1')).progress).toBe(7);
  });

  it('outros status não mexem no progresso', async () => {
    seed(fake('e1', 'Solo Leveling', { progress: 4 }));
    const entry = await setStatus('e1', 'QUERO_VER', 'u1');
    expect(entry).toMatchObject({ status: 'QUERO_VER', progress: 4 });
  });

  it('bloqueia outro usuário', async () => {
    await expect(setStatus('e1', 'COMPLETO', 'u2')).rejects.toBeInstanceOf(
      UnauthorizedEntryAccessError,
    );
    expect(db.prisma.listEntry.update).not.toHaveBeenCalled();
  });
});

describe('setProgressByTitle', () => {
  it('atualiza quando há um único resultado', async () => {
    list.findUserEntriesByTitle.mockResolvedValue([fake('e1', 'Solo Leveling')]);
    const result = await setProgressByTitle('u1', 'solo', 5);
    expect(result.entry.progress).toBe(5);
  });

  it('lança EntryNotFoundError quando nada casa', async () => {
    list.findUserEntriesByTitle.mockResolvedValue([]);
    await expect(setProgressByTitle('u1', 'naruto', 5)).rejects.toBeInstanceOf(EntryNotFoundError);
  });

  it('lança AmbiguousEntryMatchError com os candidatos quando vários casam', async () => {
    const candidates = [fake('e1', 'Frieren'), fake('e2', 'Frieren Season 2')];
    list.findUserEntriesByTitle.mockResolvedValue(candidates);
    seed(...candidates);

    const error = await setProgressByTitle('u1', 'fri', 5).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AmbiguousEntryMatchError);
    expect((error as AmbiguousEntryMatchError).candidates).toHaveLength(2);
    expect(db.prisma.listEntry.update).not.toHaveBeenCalled();
  });

  it('usa o match exato quando ele é único entre vários', async () => {
    const candidates = [fake('e1', 'Frieren'), fake('e2', 'Frieren Season 2')];
    list.findUserEntriesByTitle.mockResolvedValue(candidates);
    seed(...candidates);

    const result = await setProgressByTitle('u1', 'FRIEREN', 3);

    expect(result.entry.id).toBe('e1');
    expect(result.entry.progress).toBe(3);
  });

  it('propaga episódio inválido', async () => {
    list.findUserEntriesByTitle.mockResolvedValue([fake('e1', 'Solo Leveling')]);
    await expect(setProgressByTitle('u1', 'solo', 99)).rejects.toBeInstanceOf(
      InvalidEpisodeNumberError,
    );
  });
});

describe('markEpisodeWatched', () => {
  it('define o progresso de quem clicou', async () => {
    db.prisma.listEntry.findUnique.mockResolvedValue({ id: 'e1' });
    const result = await markEpisodeWatched('u1', 'a1', 6);
    expect(db.prisma.listEntry.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_animeId: { userId: 'u1', animeId: 'a1' } } }),
    );
    expect(result.entry.progress).toBe(6);
  });

  it('lança EntryNotFoundError se o usuário não tem o anime', async () => {
    db.prisma.listEntry.findUnique.mockResolvedValue(null);
    await expect(markEpisodeWatched('u9', 'a1', 6)).rejects.toBeInstanceOf(EntryNotFoundError);
  });
});
