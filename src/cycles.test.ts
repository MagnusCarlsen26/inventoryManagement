import {
  currentCycle,
  cycleFor,
  daysLeft,
  endDateLabel,
  endLabel,
  scheduledCycle,
  startOfDay,
} from './cycles';
import { BUILTIN_CATEGORIES } from './categories';

const iso = (y: number, m: number, d: number) => new Date(y, m - 1, d).toISOString();
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 0, 0); // mid-day "now"

describe('currentCycle', () => {
  test('weekly: now inside first cycle stays on anchor', () => {
    const c = currentCycle(iso(2026, 8, 12), 7, day(2026, 8, 14));
    expect(startOfDay(new Date(c.start)).getTime()).toBe(startOfDay(day(2026, 8, 12)).getTime());
    expect(startOfDay(new Date(c.end)).getTime()).toBe(startOfDay(day(2026, 8, 19)).getTime());
  });

  test('weekly: advances whole periods when app closed across cycles', () => {
    // anchor Aug 12, now Aug 30 -> 18 days = 2 periods -> start Aug 26
    const c = currentCycle(iso(2026, 8, 12), 7, day(2026, 8, 30));
    expect(startOfDay(new Date(c.start)).getTime()).toBe(startOfDay(day(2026, 8, 26)).getTime());
    expect(startOfDay(new Date(c.end)).getTime()).toBe(startOfDay(day(2026, 9, 2)).getTime());
  });

  test('4d: exact boundary rolls to next cycle', () => {
    // anchor Aug 12, now Aug 16 -> 4 days = 1 period -> start Aug 16
    const c = currentCycle(iso(2026, 8, 12), 4, day(2026, 8, 16));
    expect(startOfDay(new Date(c.start)).getTime()).toBe(startOfDay(day(2026, 8, 16)).getTime());
  });

  test('daily: each day is a new cycle', () => {
    const c = currentCycle(iso(2026, 8, 12), 1, day(2026, 8, 15));
    expect(startOfDay(new Date(c.start)).getTime()).toBe(startOfDay(day(2026, 8, 15)).getTime());
  });
});

describe('scheduledCycle', () => {
  const at = (c: { start: string; end: string }) => [
    startOfDay(new Date(c.start)).getTime(),
    startOfDay(new Date(c.end)).getTime(),
  ];
  const range = (a: [number, number, number], b: [number, number, number]) => [
    startOfDay(day(...a)).getTime(),
    startOfDay(day(...b)).getTime(),
  ];

  const FOUR_DAY = [2, 6, 10, 14, 18, 22, 26, 30];
  const WEEKLY = [7, 14, 21, 28];

  test('4d: mid-month lands between the surrounding schedule days', () => {
    expect(at(scheduledCycle(FOUR_DAY, day(2026, 8, 17)))).toEqual(
      range([2026, 8, 14], [2026, 8, 18]),
    );
  });

  test('4d: the last cycle of a month runs into the next month, not past it', () => {
    // Aug 30 is the month's last scheduled day; Aug 31 belongs to the same cycle, and
    // both end on Sep 2 rather than drifting to Sep 3.
    expect(at(scheduledCycle(FOUR_DAY, day(2026, 8, 30)))).toEqual(
      range([2026, 8, 30], [2026, 9, 2]),
    );
    expect(at(scheduledCycle(FOUR_DAY, day(2026, 8, 31)))).toEqual(
      range([2026, 8, 30], [2026, 9, 2]),
    );
  });

  test('4d: before the first schedule day the cycle opened last month', () => {
    expect(at(scheduledCycle(FOUR_DAY, day(2026, 9, 1)))).toEqual(
      range([2026, 8, 30], [2026, 9, 2]),
    );
  });

  test('4d: February drops the 30th instead of overflowing into March', () => {
    expect(at(scheduledCycle(FOUR_DAY, day(2026, 2, 27)))).toEqual(
      range([2026, 2, 26], [2026, 3, 2]),
    );
  });

  test('weekly: resets on the 7th/14th/21st/28th, never sliding off them', () => {
    expect(at(scheduledCycle(WEEKLY, day(2026, 8, 7)))).toEqual(range([2026, 8, 7], [2026, 8, 14]));
    // The 28th -> the 7th stretch is longer than a week: that is the point of anchoring.
    expect(at(scheduledCycle(WEEKLY, day(2026, 8, 30)))).toEqual(range([2026, 8, 28], [2026, 9, 7]));
  });

  test('15d: resets on the 1st and the 16th', () => {
    expect(at(scheduledCycle([1, 16], day(2026, 8, 1)))).toEqual(range([2026, 8, 1], [2026, 8, 16]));
    expect(at(scheduledCycle([1, 16], day(2026, 8, 20)))).toEqual(range([2026, 8, 16], [2026, 9, 1]));
  });

  test('monthly: runs the 1st to the 1st, across a year boundary', () => {
    expect(at(scheduledCycle([1], day(2026, 12, 15)))).toEqual(range([2026, 12, 1], [2027, 1, 1]));
  });

  test('daily: every day is its own cycle, including month end', () => {
    const every = Array.from({ length: 31 }, (_, i) => i + 1);
    expect(at(scheduledCycle(every, day(2026, 8, 31)))).toEqual(range([2026, 8, 31], [2026, 9, 1]));
    expect(at(scheduledCycle(every, day(2026, 2, 28)))).toEqual(range([2026, 2, 28], [2026, 3, 1]));
  });

  test('a month with no valid schedule day still gets one cycle', () => {
    expect(at(scheduledCycle([30, 31], day(2026, 2, 10)))).toEqual(
      range([2026, 1, 31], [2026, 2, 28]),
    );
  });
});

describe('cycleFor', () => {
  test('built-ins ignore the stored anchor and follow the calendar', () => {
    const weekly = BUILTIN_CATEGORIES.find((c) => c.id === 'weekly')!;
    const c = cycleFor(weekly, iso(2026, 8, 12), day(2026, 8, 17));
    // Anchor-relative would give Aug 12 -> Aug 19; the schedule gives Aug 14 -> Aug 21.
    expect(startOfDay(new Date(c.start)).getTime()).toBe(startOfDay(day(2026, 8, 14)).getTime());
    expect(startOfDay(new Date(c.end)).getTime()).toBe(startOfDay(day(2026, 8, 21)).getTime());
  });

  test('user-created frequencies keep rolling from their anchor', () => {
    const c = cycleFor({ days: 5 }, iso(2026, 8, 12), day(2026, 8, 23));
    expect(startOfDay(new Date(c.start)).getTime()).toBe(startOfDay(day(2026, 8, 22)).getTime());
    expect(startOfDay(new Date(c.end)).getTime()).toBe(startOfDay(day(2026, 8, 27)).getTime());
  });
});

describe('daysLeft / labels', () => {
  test('daysLeft counts to end (exclusive)', () => {
    const end = iso(2026, 8, 19);
    expect(daysLeft(end, day(2026, 8, 17))).toBe(2);
    expect(daysLeft(end, day(2026, 8, 18))).toBe(1);
    expect(daysLeft(end, day(2026, 8, 19))).toBe(0);
  });

  test('endLabel wording', () => {
    expect(endLabel(iso(2026, 8, 19), day(2026, 8, 17))).toBe('resets in 2 days');
    expect(endLabel(iso(2026, 8, 19), day(2026, 8, 18))).toBe('resets tomorrow');
    expect(endLabel(iso(2026, 8, 19), day(2026, 8, 19))).toBe('resets today');
  });

  test('endDateLabel shows last active day', () => {
    // end exclusive Aug 19 -> last active day Aug 18
    expect(endDateLabel(iso(2026, 8, 19))).toBe('Aug 18');
  });
});
