import { describe, expect, it } from 'vitest';
import {
  displayTitle,
  escapeHtml,
  formatUserMention,
  normalizeSearchQuery,
  normalizeUsername,
} from '../index.js';

describe('displayTitle', () => {
  it('usa titleEnglish quando presente', () => {
    expect(displayTitle({ titleEnglish: 'Frieren', titleRomaji: 'Sousou no Frieren' })).toBe(
      'Frieren',
    );
  });

  it('faz fallback para titleRomaji quando titleEnglish é null ou vazio', () => {
    expect(displayTitle({ titleEnglish: null, titleRomaji: 'Sousou no Frieren' })).toBe(
      'Sousou no Frieren',
    );
    expect(displayTitle({ titleEnglish: '  ', titleRomaji: 'Sousou no Frieren' })).toBe(
      'Sousou no Frieren',
    );
  });
});

describe('escapeHtml', () => {
  it('escapa <, >, &, " e \'', () => {
    expect(escapeHtml(`<b>Tom & "Jerry's"</b>`)).toBe(
      '&lt;b&gt;Tom &amp; &quot;Jerry&#39;s&quot;&lt;/b&gt;',
    );
  });

  it('mantém texto sem caracteres especiais', () => {
    expect(escapeHtml('Frieren')).toBe('Frieren');
  });
});

describe('formatUserMention', () => {
  it('retorna @username quando existe', () => {
    expect(formatUserMention({ name: 'Thomaz', username: 'thomaz', telegramId: 1n })).toBe(
      '@thomaz',
    );
  });

  it('retorna link tg://user quando não há username', () => {
    expect(formatUserMention({ name: 'Luiz <3', username: null, telegramId: 123n })).toBe(
      '<a href="tg://user?id=123">Luiz &lt;3</a>',
    );
  });

  it('retorna só o nome escapado sem username nem telegramId', () => {
    expect(formatUserMention({ name: 'A&B', username: null, telegramId: null })).toBe('A&amp;B');
  });
});

describe('normalizeUsername', () => {
  it('remove @, espaços e converte para minúsculas', () => {
    expect(normalizeUsername('  @LuIz ')).toBe('luiz');
  });

  it('retorna null para vazio', () => {
    expect(normalizeUsername(' @ ')).toBeNull();
    expect(normalizeUsername(null)).toBeNull();
    expect(normalizeUsername(undefined)).toBeNull();
  });
});

describe('normalizeSearchQuery', () => {
  it('remove acentos, colapsa espaços e usa minúsculas', () => {
    expect(normalizeSearchQuery('  Sōsō   no  FRIEREN é ')).toBe('soso no frieren e');
  });
});
