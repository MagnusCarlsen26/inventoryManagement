import { attentionTone, categoryAttention, summarizeAttention } from './attention';
import { currentCycle } from './cycles';
import { CategoryConfig } from './types';

const iso = (y: number, m: number, d: number) => new Date(y, m - 1, d).toISOString();
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 0, 0); // mid-day "now"

const monthly: CategoryConfig = {
  id: 'monthly',
  label: 'Monthly',
  days: 30,
  color: '#8E6FE0',
  tint: '#EFEAFB',
  icon: 'cube-outline',
  builtin: true,
};

describe('categoryAttention', () => {
  test('an empty category rests', () => {
    expect(categoryAttention(0, 0, iso(2026, 8, 19), day(2026, 8, 14))).toBe('resting');
  });

  test('a fully restocked category rests however long its cycle is', () => {
    expect(categoryAttention(12, 12, iso(2026, 8, 19), day(2026, 8, 14))).toBe('resting');
  });

  test('outstanding items with runway left stay active', () => {
    expect(categoryAttention(9, 5, iso(2026, 8, 19), day(2026, 8, 14))).toBe('active');
  });

  test('outstanding items become due the day before the reset', () => {
    expect(categoryAttention(9, 5, iso(2026, 8, 19), day(2026, 8, 18))).toBe('due');
  });

  test('outstanding items are due on reset day itself', () => {
    expect(categoryAttention(9, 5, iso(2026, 8, 19), day(2026, 8, 19))).toBe('due');
  });

  test('an unfinished daily list is due every day, since its cycle is one day', () => {
    const c = currentCycle(iso(2026, 8, 1), 1, day(2026, 8, 14));
    expect(categoryAttention(12, 3, c.end, day(2026, 8, 14))).toBe('due');
  });

  test('the monthly case: bought in week one, quiet for the rest of the cycle', () => {
    const c = currentCycle(iso(2026, 8, 1), 30, day(2026, 8, 14));
    // all 14 monthly items ticked during the first week
    expect(categoryAttention(14, 14, c.end, day(2026, 8, 14))).toBe('resting');
    expect(categoryAttention(14, 14, c.end, day(2026, 8, 25))).toBe('resting');
    // ...then the cycle rolls, reconcile drops the checks, and it comes back
    const next = currentCycle(iso(2026, 8, 1), 30, day(2026, 9, 2));
    expect(categoryAttention(14, 0, next.end, day(2026, 9, 2))).toBe('active');
  });
});

describe('attentionTone', () => {
  test('active is the untouched baseline look', () => {
    const t = attentionTone('active', monthly);
    expect(t.ring).toBe(monthly.color);
    expect(t.pillBg).toBe(monthly.tint);
    expect(t.headerOpacity).toBe(1);
    expect(t.rail).toBe('transparent');
  });

  test('resting drops the category colour and the shadow, but keeps the card', () => {
    const t = attentionTone('resting', monthly);
    expect(t.ring).not.toBe(monthly.color);
    expect(t.shadowOpacity).toBe(0);
    expect(t.elevation).toBe(0);
    expect(t.border).not.toBe('transparent');
    expect(t.headerOpacity).toBeLessThan(1);
    expect(t.rail).toBe('transparent');
  });

  test('due gets a solid pill and a coloured rail at full opacity', () => {
    const t = attentionTone('due', monthly);
    expect(t.pillBg).toBe(monthly.color);
    expect(t.pillFg).toBe('#FFFFFF');
    expect(t.rail).toBe(monthly.color);
    expect(t.headerOpacity).toBe(1);
  });
});

describe('summarizeAttention', () => {
  test('counts what needs looking at', () => {
    expect(summarizeAttention(['due', 'active', 'resting', 'resting'])).toEqual({
      needAttention: 2,
      due: 1,
    });
  });

  test('all quiet', () => {
    expect(summarizeAttention(['resting', 'resting'])).toEqual({ needAttention: 0, due: 0 });
  });
});
