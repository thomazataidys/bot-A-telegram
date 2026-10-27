import { escapeHtml, getSchedule } from '@animebot/core';
import type { ScheduleDayGroup, ScheduleItem, ScheduleResult } from '@animebot/core';
import type { Bot } from 'grammy';
import type { BotContext } from '../context.js';
import { HTML_OPTIONS, chunkLines } from '../messages.js';

export interface ScheduleFormatOptions {
  /** "Esta semana" ou "Próxima semana". */
  label: string;
  /** Mostra quem acompanha cada episódio (variação "todos"). */
  showWatchers: boolean;
}

/** "+1h", "+90min", "+1h30": o atraso do legendado em relação ao Japão. */
export function formatDelay(delayMinutes: number): string {
  const hours = Math.floor(delayMinutes / 60);
  const minutes = delayMinutes % 60;
  if (hours === 0) return `+${minutes}min`;
  return minutes === 0 ? `+${hours}h` : `+${hours}h${String(minutes).padStart(2, '0')}`;
}

function activeWatcherNames(item: ScheduleItem): string[] {
  return item.watchers.filter((w) => w.user.active).map((w) => escapeHtml(w.user.name));
}

function itemLine(item: ScheduleItem, showWatchers: boolean): string {
  const title = `<a href="${escapeHtml(item.anime.siteUrl)}">${escapeHtml(item.displayTitle)}</a>`;
  const line = `• ${item.formattedTime} — ${title} — ep ${item.episode}`;
  return showWatchers ? `${line} — ${activeWatcherNames(item).join(', ')}` : line;
}

/** Linhas da mensagem de agenda (seção 6.5); em "todos" ignora animes sem usuários ativos. */
export function formatScheduleLines(
  schedule: ScheduleResult,
  { label, showWatchers }: ScheduleFormatOptions,
): string[] {
  const days: ScheduleDayGroup[] = schedule.days
    .map((day) => ({
      ...day,
      items: showWatchers ? day.items.filter((i) => activeWatcherNames(i).length > 0) : day.items,
    }))
    .filter((day) => day.items.length > 0);

  const scope = showWatchers ? ' — todos' : '';
  const lines = [`<b>📅 ${label}${scope} (${schedule.weekRange.periodLabel})</b>`];
  if (days.length === 0) {
    lines.push('', 'Nenhum episódio previsto neste período.');
    return lines;
  }
  for (const day of days) {
    lines.push('', `<b>${escapeHtml(day.dayHeader)}</b>`);
    for (const item of day.items) lines.push(itemLine(item, showWatchers));
  }
  lines.push(
    '',
    `<i>Horários estimados para o legendado (${formatDelay(schedule.delayMinutes)} do Japão).</i>`,
  );
  return lines;
}

function registerScheduleCommand(
  bot: Bot<BotContext>,
  command: string,
  offsetWeeks: number,
  label: string,
): void {
  bot.command(command, async (ctx) => {
    const showWatchers = ctx.match.trim().toLowerCase() === 'todos';
    const schedule = await getSchedule({
      offsetWeeks,
      ...(showWatchers ? {} : { userId: ctx.user.id }),
    });
    const lines = formatScheduleLines(schedule, { label, showWatchers });
    for (const chunk of chunkLines(lines)) await ctx.reply(chunk, HTML_OPTIONS);
  });
}

export function registerSchedule(bot: Bot<BotContext>): void {
  registerScheduleCommand(bot, 'semana', 0, 'Esta semana');
  registerScheduleCommand(bot, 'proxima', 1, 'Próxima semana');
}
