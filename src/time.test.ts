import { relativeTime } from './time';

const now = new Date('2026-08-13T12:00:00.000Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

describe('relativeTime', () => {
  it('says "just now" under 45s', () => {
    expect(relativeTime(ago(10_000), now)).toBe('just now');
  });
  it('formats minutes', () => {
    expect(relativeTime(ago(5 * 60_000), now)).toBe('5m');
  });
  it('formats hours', () => {
    expect(relativeTime(ago(2 * 3600_000), now)).toBe('2h');
  });
  it('formats days', () => {
    expect(relativeTime(ago(3 * 86400_000), now)).toBe('3d');
  });
  it('formats weeks past 7 days', () => {
    expect(relativeTime(ago(14 * 86400_000), now)).toBe('2w');
  });
  it('handles garbage input', () => {
    expect(relativeTime('not-a-date', now)).toBe('');
  });
});
