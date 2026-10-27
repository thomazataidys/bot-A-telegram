import { describe, expect, it } from 'vitest';
import { parseAddArgument, parseMessageInput, slugToSearchQuery } from '../index.js';

describe('slugToSearchQuery', () => {
  it('troca hífens por espaços', () => {
    expect(slugToSearchQuery('solo-leveling')).toBe('solo leveling');
    expect(slugToSearchQuery('solo-leveling-season-2')).toBe('solo leveling season 2');
  });

  it('decodifica %XX e tolera slug inválido', () => {
    expect(slugToSearchQuery('re%3Azero')).toBe('re:zero');
    expect(slugToSearchQuery('100%-oficial')).toBe('100% oficial');
  });
});

describe('parseMessageInput — AniList', () => {
  it('extrai o id com ou sem slug, protocolo e www', () => {
    for (const text of [
      'https://anilist.co/anime/151807',
      'https://anilist.co/anime/151807/Ore-dake-Level-Up-na-Ken/',
      'http://www.anilist.co/anime/151807?x=1',
      'anilist.co/anime/151807',
    ]) {
      expect(parseMessageInput(text)).toMatchObject({ type: 'anilist', anilistId: 151807 });
    }
  });

  it('acha o link no meio do texto e devolve só a URL em rawUrl', () => {
    expect(parseMessageInput('olha esse aqui https://anilist.co/anime/16498 muito bom!')).toEqual({
      type: 'anilist',
      anilistId: 16498,
      rawUrl: 'https://anilist.co/anime/16498',
    });
  });

  it('ignora mangá e hosts parecidos', () => {
    expect(parseMessageInput('https://anilist.co/manga/30002')).toBeNull();
    expect(parseMessageInput('https://fakeanilist.co/anime/1')).toBeNull();
  });
});

describe('parseMessageInput — MAL', () => {
  it('extrai o id', () => {
    expect(parseMessageInput('https://myanimelist.net/anime/52299/Solo_Leveling')).toEqual({
      type: 'mal',
      malId: 52299,
      rawUrl: 'https://myanimelist.net/anime/52299',
    });
    expect(parseMessageInput('myanimelist.net/anime/5114')).toMatchObject({
      type: 'mal',
      malId: 5114,
    });
  });

  it('ignora outras seções do MAL', () => {
    expect(parseMessageInput('https://myanimelist.net/manga/2')).toBeNull();
  });
});

describe('parseMessageInput — Crunchyroll', () => {
  it('converte o slug em busca', () => {
    expect(
      parseMessageInput('https://www.crunchyroll.com/series/GDKHZEJ0K/solo-leveling'),
    ).toEqual({
      type: 'crunchyroll',
      seriesId: 'GDKHZEJ0K',
      slug: 'solo-leveling',
      searchQuery: 'solo leveling',
      rawUrl: 'https://www.crunchyroll.com/series/GDKHZEJ0K/solo-leveling',
    });
  });

  it('aceita código de idioma, query string e barra final', () => {
    for (const text of [
      'https://www.crunchyroll.com/pt-br/series/GDKHZEJ0K/solo-leveling',
      'https://crunchyroll.com/pt-br/series/GDKHZEJ0K/solo-leveling/',
      'https://www.crunchyroll.com/es-419/series/GDKHZEJ0K/solo-leveling?utm_source=x',
      'https://www.crunchyroll.com/en/series/GDKHZEJ0K/solo-leveling#top',
    ]) {
      expect(parseMessageInput(text)).toMatchObject({
        type: 'crunchyroll',
        seriesId: 'GDKHZEJ0K',
        slug: 'solo-leveling',
        searchQuery: 'solo leveling',
      });
    }
  });

  it('ignora páginas que não são de série', () => {
    expect(parseMessageInput('https://www.crunchyroll.com/watch/GRDQPM1ZY/ep-1')).toBeNull();
    expect(parseMessageInput('https://www.crunchyroll.com/series/GDKHZEJ0K')).toBeNull();
  });
});

describe('parseMessageInput — vários links e "+ nome"', () => {
  it('usa o link que aparece primeiro', () => {
    expect(
      parseMessageInput('https://myanimelist.net/anime/1 e https://anilist.co/anime/2'),
    ).toMatchObject({ type: 'mal', malId: 1 });
    expect(
      parseMessageInput('https://anilist.co/anime/2 e https://myanimelist.net/anime/1'),
    ).toMatchObject({ type: 'anilist', anilistId: 2 });
  });

  it('detecta "+ nome" com ou sem espaço', () => {
    expect(parseMessageInput('+ solo leveling')).toEqual({
      type: 'plus_query',
      searchQuery: 'solo leveling',
    });
    expect(parseMessageInput('  +frieren  ')).toEqual({
      type: 'plus_query',
      searchQuery: 'frieren',
    });
  });

  it('ignora "+1", "++", "+" e "+" que não está no início', () => {
    for (const text of ['+1', '++', '+', '+ ', '++ frieren', '+ a', 'eu +1 nisso', '2 + 2 solo']) {
      expect(parseMessageInput(text)).toBeNull();
    }
  });

  it('ignora comandos e texto comum', () => {
    expect(parseMessageInput('/add https://anilist.co/anime/1')).toBeNull();
    expect(parseMessageInput('bom dia, pessoal')).toBeNull();
    expect(parseMessageInput('')).toBeNull();
  });

  it('o link vence o "+" quando os dois aparecem', () => {
    expect(parseMessageInput('+ https://anilist.co/anime/5')).toMatchObject({
      type: 'anilist',
      anilistId: 5,
    });
  });
});

describe('parseAddArgument', () => {
  it('distingue link, texto livre e vazio', () => {
    expect(parseAddArgument('https://anilist.co/anime/9')).toMatchObject({
      type: 'anilist',
      anilistId: 9,
    });
    expect(parseAddArgument('  solo   leveling ')).toEqual({
      type: 'search_query',
      searchQuery: 'solo leveling',
    });
    expect(parseAddArgument('   ')).toBeNull();
  });

  it('aceita nomes curtos ou numéricos e tira o "+" inicial', () => {
    expect(parseAddArgument('86')).toEqual({ type: 'search_query', searchQuery: '86' });
    expect(parseAddArgument('+ frieren')).toEqual({ type: 'search_query', searchQuery: 'frieren' });
  });

  it('rejeita URL que não é suportada', () => {
    expect(parseAddArgument('https://example.com/anime/1')).toBeNull();
  });
});
