import { describe, expect, it } from 'vitest';
import { escapeHtml } from './escape.js';

describe('escapeHtml', () => {
  it('escapa &, < e >', () => {
    expect(escapeHtml('<b>Tom & Jerry</b>')).toBe('&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;');
  });

  it('mantém texto sem caracteres especiais', () => {
    expect(escapeHtml('Frieren')).toBe('Frieren');
  });
});
