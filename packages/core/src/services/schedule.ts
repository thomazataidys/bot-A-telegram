import { prisma } from '@animebot/db';
import type { AiringEpisode, Anime } from '@animebot/db';
import {
  addMinutes,
  formatDayHeaderBR,
  formatDayKey,
  formatTimeBR,
  formatWeekPeriodBR,
  getZonedParts,
  zonedTimeToUtc,
} from '../utils/date.js';
import { displayTitle } from '../utils/title.js';
import type { GlobalAnimeWatcher } from './list.js';
import { getSettings } from './settings.js';

export interface WeekRange {
  offsetWeeks: number;
  timezone: string;
  /** Segunda-feira 00:00:00.000 no fuso configurado, em UTC. */
  startUtc: Date;
  /** Domingo 23:59:59.999 no fuso configurado, em UTC. */
  endUtc: Date;
  /** Ex.: "27/10 – 02/11". */
  periodLabel: string;
}

export interface ScheduleItem {
  airingEpisode: AiringEpisode;
  anime: Anime;
  displayTitle: string;
  episode: number;
  /** airingAt original (UTC). */
  japanAiringAt: Date;
  /** airingAt + notificationDelayMinutes. */
  subbedAiringAt: Date;
  /** Ex.: "13:30" no fuso configurado. */
  formattedTime: string;
  /** Ex.: "Segunda, 27/10". */
  formattedDayHeader: string;
  /** "YYYY-MM-DD" no fuso configurado (agrupamento). */
  dayKey: string;
  watchers: GlobalAnimeWatcher[];
}

export interface ScheduleDayGroup {
  dayKey: string;
  dayHeader: string;
  items: ScheduleItem[];
}

export interface ScheduleResult {
  weekRange: WeekRange;
  delayMinutes: number;
  timezone: string;
  days: ScheduleDayGroup[];
  items: ScheduleItem[];
}

export interface GetScheduleParams {
  /** Se omitido, retorna a agenda global (todos os animes monitorados). */
  userId?: string;
  /** 0 = esta semana (padrão), 1 = próxima semana. */
  offsetWeeks?: number;
  now?: Date;
}

/** Início (segunda 00:00:00.000) e fim (domingo 23:59:59.999) da semana no fuso configurado. */
export function getWeekRange(
  offsetWeeks: number,
  timezone: string,
  now: Date = new Date(),
): WeekRange {
  const today = getZonedParts(now, timezone);
  const daysSinceMonday = (today.weekday + 6) % 7;
  // Date.UTC normaliza dias fora do mês, então a aritmética é feita no calendário local.
  const monday = new Date(Date.UTC(today.year, today.month - 1, today.day - daysSinceMonday));
  const mondayParts = (weeks: number): { year: number; month: number; day: number } => {
    const date = new Date(monday.getTime() + weeks * 7 * 86_400_000);
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
  };

  const startUtc = zonedTimeToUtc(mondayParts(offsetWeeks), timezone);
  const nextStartUtc = zonedTimeToUtc(mondayParts(offsetWeeks + 1), timezone);
  const endUtc = new Date(nextStartUtc.getTime() - 1);
  return {
    offsetWeeks,
    timezone,
    startUtc,
    endUtc,
    periodLabel: formatWeekPeriodBR(startUtc, endUtc, timezone),
  };
}

type EpisodeRow = AiringEpisode & {
  anime: Anime & {
    entries: {
      id: string;
      status: GlobalAnimeWatcher['status'];
      progress: number;
      user: GlobalAnimeWatcher['user'];
    }[];
  };
};

function toScheduleItem(row: EpisodeRow, delayMinutes: number, timezone: string): ScheduleItem {
  const {
    anime: { entries, ...anime },
    ...airingEpisode
  } = row;
  const subbedAiringAt = addMinutes(row.airingAt, delayMinutes);
  return {
    airingEpisode,
    anime,
    displayTitle: displayTitle(anime),
    episode: row.episode,
    japanAiringAt: row.airingAt,
    subbedAiringAt,
    formattedTime: formatTimeBR(subbedAiringAt, timezone),
    formattedDayHeader: formatDayHeaderBR(subbedAiringAt, timezone),
    dayKey: formatDayKey(subbedAiringAt, timezone),
    watchers: entries.map((entry) => ({
      user: entry.user,
      entryId: entry.id,
      status: entry.status,
      progress: entry.progress,
    })),
  };
}

/** Episódios cujo airingAt + delay cai em [fromSubbed, toSubbed], ordenados por horário legendado. */
async function findItems(
  fromSubbed: Date,
  toSubbed: Date,
  delayMinutes: number,
  timezone: string,
  userId?: string,
): Promise<ScheduleItem[]> {
  const rows = await prisma.airingEpisode.findMany({
    where: {
      airingAt: {
        gte: addMinutes(fromSubbed, -delayMinutes),
        lte: addMinutes(toSubbed, -delayMinutes),
      },
      anime: { entries: { some: userId === undefined ? {} : { userId } } },
    },
    orderBy: { airingAt: 'asc' },
    include: {
      anime: {
        include: {
          entries: { include: { user: true }, orderBy: { addedAt: 'asc' } },
        },
      },
    },
  });
  return (rows as EpisodeRow[]).map((row) => toScheduleItem(row, delayMinutes, timezone));
}

/** Agenda da semana ordenada por horário, com o atraso do legendado já aplicado. */
export async function getSchedule(params: GetScheduleParams = {}): Promise<ScheduleResult> {
  const { userId, offsetWeeks = 0, now = new Date() } = params;
  const { notificationDelayMinutes: delayMinutes, timezone } = await getSettings();
  const weekRange = getWeekRange(offsetWeeks, timezone, now);
  const items = await findItems(
    weekRange.startUtc,
    weekRange.endUtc,
    delayMinutes,
    timezone,
    userId,
  );

  const days: ScheduleDayGroup[] = [];
  for (const item of items) {
    const last = days[days.length - 1];
    if (last?.dayKey === item.dayKey) {
      last.items.push(item);
    } else {
      days.push({ dayKey: item.dayKey, dayHeader: item.formattedDayHeader, items: [item] });
    }
  }
  return { weekRange, delayMinutes, timezone, days, items };
}

/** Episódios cujo horário legendado cai nas próximas `hours` horas (padrão: 48h). */
export async function getUpcomingEpisodes(
  hours = 48,
  now: Date = new Date(),
): Promise<ScheduleItem[]> {
  const { notificationDelayMinutes: delayMinutes, timezone } = await getSettings();
  return findItems(now, addMinutes(now, hours * 60), delayMinutes, timezone);
}
