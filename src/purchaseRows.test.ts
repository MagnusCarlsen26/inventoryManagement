/**
 * Purchase-list entries and todos share the `todos` table (see PURCHASE_TABLE in
 * remote.ts). The `p-` id prefix is the only thing keeping them apart, so these tests
 * pin that boundary: a leak in either direction would either hide a real todo or show
 * a purchase entry on the todo screen.
 */

import { isPurchaseRow } from './remote';

describe('isPurchaseRow', () => {
  test('matches ids minted by addPurchase', () => {
    // `p-${Date.now()}-${rand}` — the shape useInventory.addPurchase generates.
    expect(isPurchaseRow('p-1755194400000-k3f9a')).toBe(true);
  });

  test('does not match todo ids', () => {
    // `t-${Date.now()}` — the shape useTodos.addTodo generates.
    expect(isPurchaseRow('t-1755194400000')).toBe(false);
  });

  test('does not match todo category ids', () => {
    expect(isPurchaseRow('tc-general')).toBe(false);
    expect(isPurchaseRow('tc-1755194400000')).toBe(false);
  });

  test('does not match restock item or category ids', () => {
    // seedItems uses bare slugs; user items are `u-`, custom frequencies `c-`.
    expect(isPurchaseRow('u-1755194400000')).toBe(false);
    expect(isPurchaseRow('c-1755194400000')).toBe(false);
    expect(isPurchaseRow('milk')).toBe(false);
    expect(isPurchaseRow('monthly')).toBe(false);
  });

  test('is not fooled by a p elsewhere in the id', () => {
    expect(isPurchaseRow('tp-1')).toBe(false);
    expect(isPurchaseRow('shop-p-1')).toBe(false);
  });

  test('survives null/undefined/non-string ids without throwing', () => {
    expect(isPurchaseRow(null)).toBe(false);
    expect(isPurchaseRow(undefined)).toBe(false);
    expect(isPurchaseRow(42)).toBe(false);
  });
});
