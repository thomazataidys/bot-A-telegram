import type { ScheduleItem, ScheduleResult } from '@animebot/core';
import { describe, expect, it } from 'vitest';
import { formatDelay, formatScheduleLines } from '../commands/schedule.js';

function item(title: string, time: string, watchers: { name: string; active: boolean }[]) {
  return {
    displayTitle: title,
    episode: 5,
    formattedTime: time,
    anime: { siteUrl: 'https://anilist.co/anime/1' },
    watchers: watchers.map((w) => ({ user: { name: w.name, active: w.active } })),
  } as unknown as ScheduleItem;
}

function result(items: ScheduleItem[]): ScheduleResult {
  return {
    delayMinutes: 60,
    weekRange: { periodLabel: '26/10 – 01/11' },
    days: items.length > 0 ? [{ dayKey: '2026-10-26', dayHeader: 'Segunda, 26/10', items }] : [],
    items,
  } as unknown as ScheduleResult;
}

describe('formatDelay', () => {
  it('formata horas, minutos e mistos', () => {
    expect(formatDelay(60)).toBe('+1h');
    expect(formatDelay(30)).toBe('+30min');
    expect(formatDelay(90)).toBe('+1h30');
  });
});

describe('formatScheduleLines', () => {
  it('agrupa por dia, mostra horário com atraso e rodapé', () => {
    const lines = formatScheduleLines(result([item('Solo <Leveling>', '13:30', [])]), {
      label: 'Esta semana',
      showWatchers: false,
    });
    expect(lines[0]).toBe('<b>📅 Esta semana (26/10 – 01/11)</b>');
    expect(lines).toContain('<b>Segunda, 26/10</b>');
    expect(lines).toContain(
      '• 13:30 — <a href="https://anilist.co/anime/1">Solo &lt;Leveling&gt;</a> — ep 5',
    );
    expect(lines.at(-1)).toBe('<i>Horários estimados para o legendado (+1h do Japão).</i>');
  });

  it('variação todos mostra só usuários ativos e omite animes sem eles', () => {
    const lines = formatScheduleLines(
      result([
        item('A', '10:00', [
          { name: 'Ana', active: true },
          { name: 'Zé', active: false },
        ]),
        item('B', '11:00', [{ name: 'Zé', active: false }]),
      ]),
      { label: 'Próxima semana', showWatchers: true },
    );
    const text = lines.join('\n');
    expect(lines[0]).toContain('Próxima semana — todos');
    expect(text).toContain('— ep 5 — Ana');
    expect(text).not.toContain('Zé');
    expect(text).not.toContain('>B<');
  });

  it('semana vazia avisa que não há episódios', () => {
    const lines = formatScheduleLines(result([]), { label: 'Esta semana', showWatchers: false });
    expect(lines.join('\n')).toContain('Nenhum episódio previsto');
  });
});
