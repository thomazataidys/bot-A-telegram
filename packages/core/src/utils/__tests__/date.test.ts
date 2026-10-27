import { describe, expect, it } from 'vitest';
import {
  addMinutes,
  formatDateTimeBR,
  formatDayHeaderBR,
  formatDayKey,
  formatWeekPeriodBR,
  zonedTimeToUtc,
} from '../date.js';

const TZ = 'America/Fortaleza';

describe('date utils', () => {
  it('formata data/hora no fuso configurado', () => {
    expect(formatDateTimeBR(new Date('2026-10-29T16:30:00Z'), TZ)).toBe('qui, 29/10 às 13:30');
  });

  it('formata cabeçalho de dia e período', () => {
    const start = new Date('2026-10-26T03:00:00Z');
    expect(formatDayHeaderBR(start, TZ)).toBe('Segunda, 26/10');
    expect(formatWeekPeriodBR(start, new Date('2026-11-02T02:59:59.999Z'), TZ)).toBe(
      '26/10 – 01/11',
    );
  });

  it('dayKey usa o dia local, não o UTC', () => {
    expect(formatDayKey(new Date('2026-10-26T02:59:59Z'), TZ)).toBe('2026-10-25');
    expect(formatDayKey(new Date('2026-10-26T03:00:00Z'), TZ)).toBe('2026-10-26');
  });

  it('zonedTimeToUtc converte hora de parede para UTC (inclusive com horário de verão)', () => {
    expect(zonedTimeToUtc({ year: 2026, month: 10, day: 26 }, TZ).toISOString()).toBe(
      '2026-10-26T03:00:00.000Z',
    );
    // Referência com horário de verão: Nova York
    expect(
      zonedTimeToUtc({ year: 2026, month: 7, day: 1, hour: 12 }, 'America/New_York').toISOString(),
    ).toBe('2026-07-01T16:00:00.000Z');
    expect(
      zonedTimeToUtc({ year: 2026, month: 1, day: 1, hour: 12 }, 'America/New_York').toISOString(),
    ).toBe('2026-01-01T17:00:00.000Z');
  });

  it('addMinutes não muta o original', () => {
    const date = new Date('2026-10-26T00:00:00Z');
    expect(addMinutes(date, 90).toISOString()).toBe('2026-10-26T01:30:00.000Z');
    expect(date.toISOString()).toBe('2026-10-26T00:00:00.000Z');
  });
});
