/** Pure date/cycle helpers. All dates handled at day granularity (local time). */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Start of the given day (00:00 local). */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toISODate(d: Date): string {
  return startOfDay(d).toISOString();
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export interface Cycle {
  /** ISO start of the current cycle */
  start: string;
  /** ISO end (exclusive) of the current cycle */
  end: string;
}

/**
 * Given an anchor (some past cycle start) and a period length in days, advance
 * in whole periods until the cycle contains `now`. Returns that live cycle.
 */
export function currentCycle(anchorISO: string, days: number, now: Date = new Date()): Cycle {
  const anchor = startOfDay(new Date(anchorISO));
  const today = startOfDay(now);

  let elapsedDays = Math.floor((today.getTime() - anchor.getTime()) / MS_PER_DAY);
  if (elapsedDays < 0) elapsedDays = 0; // anchor in the future -> treat as current
  const periods = Math.floor(elapsedDays / days);

  const start = new Date(anchor.getTime() + periods * days * MS_PER_DAY);
  const end = new Date(start.getTime() + days * MS_PER_DAY);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Whole days from `now` until the cycle end (exclusive). end day itself = counts. */
export function daysLeft(endISO: string, now: Date = new Date()): number {
  const end = startOfDay(new Date(endISO));
  const today = startOfDay(now);
  return Math.round((end.getTime() - today.getTime()) / MS_PER_DAY);
}

export function endLabel(endISO: string, now: Date = new Date()): string {
  const n = daysLeft(endISO, now);
  if (n <= 0) return 'resets today';
  if (n === 1) return 'resets tomorrow';
  return `resets in ${n} days`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** e.g. "Aug 15" — the last active day of the cycle (end is exclusive). */
export function endDateLabel(endISO: string): string {
  const last = new Date(new Date(endISO).getTime() - MS_PER_DAY);
  return `${MONTHS[last.getMonth()]} ${last.getDate()}`;
}
