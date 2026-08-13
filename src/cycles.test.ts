import { currentCycle, daysLeft, endDateLabel, endLabel, startOfDay } from './cycles';

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
