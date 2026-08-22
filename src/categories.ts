import { CategoryConfig, CategoryId } from './types';

/** Every day of the month, so a "daily" cycle rolls over at each midnight. */
const EVERY_DAY = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * The five shipped frequencies and the calendar dates each one resets on, as specified
 * by the client. `daysOfMonth` — not `days` — is what actually drives the cycle: these
 * restart with every month rather than drifting, so e.g. weekly is always the 7th,
 * 14th, 21st and 28th and never slides onto some other weekday over time.
 */
export const BUILTIN_CATEGORIES: CategoryConfig[] = [
  { id: 'daily',   label: 'Daily',         days: 1,  daysOfMonth: EVERY_DAY,                    color: '#EF5D60', tint: '#FDECEC', icon: 'sunny-outline',    builtin: true },
  { id: '4d',      label: 'Every 4 Days',  days: 4,  daysOfMonth: [2, 6, 10, 14, 18, 22, 26, 30], color: '#F0932B', tint: '#FDF0E3', icon: 'timer-outline',    builtin: true },
  { id: 'weekly',  label: 'Weekly',        days: 7,  daysOfMonth: [7, 14, 21, 28],              color: '#27AE60', tint: '#E6F6EC', icon: 'calendar-outline', builtin: true },
  { id: '15d',     label: 'Every 15 Days', days: 15, daysOfMonth: [1, 16],                      color: '#2D9CDB', tint: '#E4F2FB', icon: 'albums-outline',   builtin: true },
  { id: 'monthly', label: 'Monthly',       days: 30, daysOfMonth: [1],                          color: '#8E6FE0', tint: '#EFEAFB', icon: 'cube-outline',     builtin: true },
];

/** Colors handed out to user-created frequencies, in order of creation. */
const PALETTE: Array<Pick<CategoryConfig, 'color' | 'tint'>> = [
  { color: '#EB2F96', tint: '#FCE7F2' },
  { color: '#16A085', tint: '#E4F5F0' },
  { color: '#2F80ED', tint: '#E7F0FD' },
  { color: '#E67E22', tint: '#FCF0E4' },
  { color: '#6C5CE7', tint: '#ECEAFB' },
  { color: '#C0392B', tint: '#F9E7E5' },
];

/** Build a config for a user-created frequency. `index` = how many exist already. */
export function makeCategory(label: string, days: number, index: number): CategoryConfig {
  const p = PALETTE[index % PALETTE.length];
  return {
    id: `c-${Date.now()}`,
    label: label.trim(),
    days,
    color: p.color,
    tint: p.tint,
    icon: 'repeat-outline',
    builtin: false,
  };
}

/** Built-ins first, then persisted custom categories (deduped by id), sorted by cycle length. */
export function mergeCategories(custom: CategoryConfig[]): CategoryConfig[] {
  const seen = new Set(BUILTIN_CATEGORIES.map((c) => c.id));
  const extra = custom.filter((c) => !seen.has(c.id)).map((c) => ({ ...c, builtin: false }));
  return [...BUILTIN_CATEGORIES, ...extra].sort((a, b) => a.days - b.days);
}

export function categoryMap(categories: CategoryConfig[]): Record<CategoryId, CategoryConfig> {
  return categories.reduce(
    (acc, c) => ((acc[c.id] = c), acc),
    {} as Record<CategoryId, CategoryConfig>,
  );
}
