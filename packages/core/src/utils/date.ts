const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
const WEEKDAYS_LONG = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

/** Data e hora de parede (calendário local) de um instante em um fuso. */
export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = domingo ... 6 = sábado */
  weekday: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatterCache.set(timezone, formatter);
  }
  return formatter;
}

export function getZonedParts(date: Date, timezone: string): ZonedParts {
  const values: Record<string, number> = {};
  for (const part of formatterFor(timezone).formatToParts(date)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  const year = values.year ?? 1970;
  const month = values.month ?? 1;
  const day = values.day ?? 1;
  return {
    year,
    month,
    day,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

/** Converte uma data/hora de parede em `timezone` para o instante UTC correspondente. */
export function zonedTimeToUtc(
  parts: Pick<ZonedParts, 'year' | 'month' | 'day'> &
    Partial<Pick<ZonedParts, 'hour' | 'minute' | 'second'>>,
  timezone: string,
): Date {
  const wallClockMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  );
  // Ajusta pelo deslocamento do fuso; a segunda passada cobre viradas de horário de verão.
  let guess = wallClockMs;
  for (let i = 0; i < 2; i += 1) {
    const local = getZonedParts(new Date(guess), timezone);
    const localMs = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    guess += wallClockMs - localMs;
  }
  return new Date(guess);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** "YYYY-MM-DD" do dia local em `timezone`. */
export function formatDayKey(date: Date, timezone: string): string {
  const { year, month, day } = getZonedParts(date, timezone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** "13:30" no fuso informado. */
export function formatTimeBR(date: Date, timezone: string): string {
  const { hour, minute } = getZonedParts(date, timezone);
  return `${pad(hour)}:${pad(minute)}`;
}

/** Formata data/hora no fuso configurado em formato curto PT-BR: "qua, 29/10 às 13:30". */
export function formatDateTimeBR(date: Date, timezone: string): string {
  const { day, month, weekday } = getZonedParts(date, timezone);
  return `${WEEKDAYS_SHORT[weekday]}, ${pad(day)}/${pad(month)} às ${formatTimeBR(date, timezone)}`;
}

/** Formata cabeçalho de dia da agenda em PT-BR: "Segunda, 27/10". */
export function formatDayHeaderBR(date: Date, timezone: string): string {
  const { day, month, weekday } = getZonedParts(date, timezone);
  return `${WEEKDAYS_LONG[weekday]}, ${pad(day)}/${pad(month)}`;
}

/** Formata intervalo de datas curto em PT-BR: "27/10 – 02/11". */
export function formatWeekPeriodBR(start: Date, end: Date, timezone: string): string {
  const from = getZonedParts(start, timezone);
  const to = getZonedParts(end, timezone);
  return `${pad(from.day)}/${pad(from.month)} – ${pad(to.day)}/${pad(to.month)}`;
}

/** Soma minutos a um Date sem mutar o original. */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
