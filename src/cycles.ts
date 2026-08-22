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

// ---- calendar-anchored cycles ---------------------------------------------
//
// The client restocks on fixed dates, not on a period rolling from whenever the app
// was first opened: every 4 days means the 2nd, 6th, 10th … 30th, and weekly means the
// 7th, 14th, 21st and 28th — both restarting with each new month. `currentCycle` above
// can't express that (its cycles drift across month boundaries), so a category may
// instead carry a set of days-of-month and use `scheduledCycle`.

/** How many days the given month has (`month` is 0-based, as in `Date`). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * The schedule days that actually exist in the given month, ascending.
 *
 * A day the month is too short for is skipped — "every 4 days" simply runs the 26th
 * straight into the 2nd of March. If that would leave a month with no start day at
 * all, its last day stands in, so every month always has at least one cycle.
 */
function daysForMonth(daysOfMonth: number[], year: number, month: number): number[] {
  const max = daysInMonth(year, month);
  const days = [...new Set(daysOfMonth)].filter((d) => d >= 1 && d <= max).sort((a, b) => a - b);
  return days.length ? days : [max];
}

const prevMonth = (y: number, m: number) => (m === 0 ? [y - 1, 11] : [y, m - 1]);
const nextMonth = (y: number, m: number) => (m === 11 ? [y + 1, 0] : [y, m + 1]);

/**
 * The cycle containing `now` for a category that restocks on fixed days of the month.
 *
 * Needs no anchor: the calendar alone decides, so every device (and the server) derives
 * the same cycle without having to agree on stored state first.
 */
export function scheduledCycle(daysOfMonth: number[], now: Date = new Date()): Cycle {
  const today = startOfDay(now);
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  const days = daysForMonth(daysOfMonth, y, m);

  const startDay = days.filter((s) => s <= d).pop();
  let start: Date;
  if (startDay !== undefined) {
    start = new Date(y, m, startDay);
  } else {
    // Before this month's first scheduled day — the live cycle opened last month.
    const [py, pm] = prevMonth(y, m);
    const prev = daysForMonth(daysOfMonth, py, pm);
    start = new Date(py, pm, prev[prev.length - 1]);
  }

  const endDay = days.find((s) => s > d);
  let end: Date;
  if (endDay !== undefined) {
    end = new Date(y, m, endDay);
  } else {
    const [ny, nm] = nextMonth(y, m);
    end = new Date(ny, nm, daysForMonth(daysOfMonth, ny, nm)[0]);
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

/** The parts of a category `cycleFor` reads — so cycles.ts needn't import CategoryConfig. */
export interface Scheduled {
  days: number;
  daysOfMonth?: number[];
}

/**
 * Resolve a category's live cycle: calendar-anchored when it declares fixed restock
 * days (the five built-ins), otherwise the original anchor-relative rolling period
 * (user-created frequencies, which are just "every N days" from when they were made).
 */
export function cycleFor(config: Scheduled, anchorISO: string | undefined, now: Date = new Date()): Cycle {
  if (config.daysOfMonth?.length) return scheduledCycle(config.daysOfMonth, now);
  return currentCycle(anchorISO ?? new Date().toISOString(), config.days, now);
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
