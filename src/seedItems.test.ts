import { SEED_ITEMS, isSeedId, mergeSeed, reviseSeed, seedId } from './seedItems';
import { BUILTIN_CATEGORIES } from './categories';

describe('SEED_ITEMS', () => {
  test('every item sits in one of the shipped frequencies', () => {
    const known = new Set(BUILTIN_CATEGORIES.map((c) => c.id));
    for (const it of SEED_ITEMS) expect(known.has(it.category)).toBe(true);
  });

  test('ids are unique and derived from the name', () => {
    const ids = SEED_ITEMS.map((it) => it.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const it of SEED_ITEMS) expect(it.id).toBe(seedId(it.name));
  });

  test('names dictated twice are kept once, on their first listing', () => {
    const byName = SEED_ITEMS.filter((it) => it.name === 'Staff Rice');
    expect(byName).toHaveLength(1);
    expect(byName[0].category).toBe('15d');
    // Listed under both D and E — the more frequent listing wins.
    const tissue = SEED_ITEMS.filter((it) => it.name === 'Tissue');
    expect(tissue).toHaveLength(1);
    expect(tissue[0].category).toBe('15d');
  });

  test('the client list is transcribed in full', () => {
    const counts = SEED_ITEMS.reduce<Record<string, number>>(
      (acc, it) => ((acc[it.category] = (acc[it.category] ?? 0) + 1), acc),
      {},
    );
    // A: 9, B: 3, C: 12, D: 44 less one repeated 'Staff Rice', E: 99 less 'Tissue'.
    expect(counts).toEqual({ daily: 9, '4d': 3, weekly: 12, '15d': 43, monthly: 98 });
  });

  test('ids stay distinct for names that differ only in punctuation/size', () => {
    expect(seedId('Carry Bag 13x16')).not.toBe(seedId('Carry Bag 10x14'));
    expect(seedId('S/W Box')).toBe('seed-s-w-box');
    expect(seedId('Fork / Spoon')).toBe('seed-fork-spoon');
  });
});

describe('reviseSeed', () => {
  test('drops seed rows the client removed and keeps user-added items', () => {
    const { upserts, staleIds } = reviseSeed([
      { id: 'seed-0' }, // positional id from the pre-v2 list
      { id: 'seed-99' },
      { id: SEED_ITEMS[0].id }, // still on the list
      { id: 'u-1755870000000' }, // added in-app by an admin
    ]);
    expect(staleIds).toEqual(['seed-0', 'seed-99']);
    expect(upserts).toBe(SEED_ITEMS);
  });

  test('only app-seeded ids are ever considered stale', () => {
    expect(isSeedId('seed-paneer')).toBe(true);
    expect(isSeedId('u-1755870000000')).toBe(false);
  });
});

describe('mergeSeed', () => {
  const cached = [
    { id: 'seed-0', name: 'Amul Butter', category: 'weekly' },
    { id: 'u-1', name: 'Shop-specific thing', category: 'daily' },
  ];

  test('replaces the old seed list, keeps user-added items', () => {
    const merged = mergeSeed(cached);
    expect(merged).toHaveLength(SEED_ITEMS.length + 1);
    expect(merged.find((it) => it.id === 'seed-0')).toBeUndefined();
    expect(merged.find((it) => it.id === 'u-1')?.name).toBe('Shop-specific thing');
  });

  test('re-files a seed item the client moved to another frequency', () => {
    // Mozzarella was on the daily list before; the client now restocks it weekly.
    const stray = { id: seedId('Mozzarella'), name: 'Mozzarella', category: 'daily' };
    const merged = mergeSeed([...cached, stray]);
    expect(merged.filter((it) => it.name === 'Mozzarella')).toEqual([
      { id: seedId('Mozzarella'), name: 'Mozzarella', category: 'weekly' },
    ]);
  });

  test('is idempotent', () => {
    expect(mergeSeed(mergeSeed(cached))).toEqual(mergeSeed(cached));
  });
});
