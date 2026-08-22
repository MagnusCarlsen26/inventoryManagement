/**
 * Launch smoke test.
 *
 * Mounts the real App the way a phone does — identity in AsyncStorage, no network —
 * so a render-time throw anywhere in useInventory → RestockScreen → PurchaseListSection
 * → CategorySection → ItemRow fails here instead of on someone's handset.
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import renderer, { act } from 'react-test-renderer';
import App from '../../App';
import { SEED_VERSION } from '../seedItems';

// Every remote call is fire-and-forget with a swallowed catch, so an offline launch is
// the honest default for this test — and the one most likely to be hit in the shop.
beforeAll(() => {
  (global as any).fetch = jest.fn(() => Promise.reject(new Error('offline')));
});

/** Serve PostgREST-shaped responses per table so a real sync() round trip completes. */
function mockSupabase(tables: Record<string, any[]>) {
  (global as any).fetch = jest.fn((input: any) => {
    const url = String(typeof input === 'string' ? input : input?.url ?? '');
    const table = url.split('/rest/v1/')[1]?.split('?')[0] ?? '';
    const body = JSON.stringify(tables[table] ?? []);
    return Promise.resolve(
      new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

/** All rendered text, flattened — props hold circular refs so JSON.stringify is out. */
function textOf(node: any): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  return textOf(node.children);
}

const mounted: renderer.ReactTestRenderer[] = [];

/**
 * Expand the purchase list. It ships collapsed, so its rows — the part of the tree most
 * likely to throw — are only mounted once someone taps the header.
 */
async function openPurchaseList(tree: renderer.ReactTestRenderer) {
  const header = tree.root
    .findAllByProps({ testID: 'purchase-list-toggle' })
    .find((n: any) => typeof n.props.onPress === 'function');
  await act(async () => {
    (header as any).props.onPress();
  });
}

async function mount() {
  let tree: renderer.ReactTestRenderer | undefined;
  await act(async () => {
    tree = renderer.create(<App />);
  });
  // Let the initial loadState()/useEffect chain settle.
  await act(async () => {
    await Promise.resolve();
  });
  mounted.push(tree!);
  return tree!;
}

// Unmount so the 20s sync and 15s approval polls are cleared and jest can exit.
afterEach(async () => {
  await act(async () => {
    while (mounted.length) mounted.pop()!.unmount();
  });
});

describe('app launch', () => {
  test('renders the restock tracker for an admin without throwing', async () => {
    await AsyncStorage.setItem(
      'inv:identity',
      JSON.stringify({ id: 'admin', name: 'Admin', role: 'admin', approved: true }),
    );

    const tree = await mount();
    const json = textOf(tree.toJSON());
    expect(json).toContain('Restock Tracker');
    expect(json).toContain('Purchase List');
  });

  test('renders for approved staff without throwing', async () => {
    await AsyncStorage.setItem(
      'inv:identity',
      JSON.stringify({ id: 'u1', name: 'Ravi', role: 'staff', approved: true }),
    );

    const tree = await mount();
    expect(textOf(tree.toJSON())).toContain('Purchase List');
  });

  test('renders with a purchase entry on the list', async () => {
    await AsyncStorage.setItem(
      'inv:identity',
      JSON.stringify({ id: 'admin', name: 'Admin', role: 'admin', approved: true }),
    );
    await AsyncStorage.setItem(
      'inv:items',
      JSON.stringify([{ id: 'i1', name: 'Amul Butter', category: 'weekly' }]),
    );
    // Marks the cache as already on the shipped seed list, so this stays a one-item
    // fixture instead of being reconciled against SEED_ITEMS on load.
    await AsyncStorage.setItem('inv:seedVersion', String(SEED_VERSION));
    await AsyncStorage.setItem(
      'inv:purchases',
      JSON.stringify([
        {
          id: 'p-1',
          itemId: 'i1',
          note: '500g pack',
          addedById: 'admin',
          addedByName: 'Admin',
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    );

    const tree = await mount();
    await openPurchaseList(tree);
    const json = textOf(tree.toJSON());
    expect(json).toContain('Amul Butter');
    expect(json).toContain('500g pack');
  });

  test('survives a full sync, with purchase entries sharing the todos table', async () => {
    await AsyncStorage.setItem(
      'inv:identity',
      JSON.stringify({ id: 'admin', name: 'Admin', role: 'admin', approved: true }),
    );

    const stamp = new Date().toISOString();
    mockSupabase({
      items: [
        { id: 'i1', name: 'Amul Butter', category: 'weekly', deleted: false, updated_at: stamp },
        { id: 'i2', name: 'Toor Dal', category: 'monthly', deleted: false, updated_at: stamp },
      ],
      categories: [],
      anchors: [
        { category_id: 'weekly', anchor: stamp, updated_at: stamp },
        { category_id: 'monthly', anchor: stamp, updated_at: stamp },
      ],
      checks: [
        { item_id: 'i1', cycle: stamp, checked: true, by_id: 'admin', by_name: 'Admin', at: stamp },
      ],
      users: [],
      // The shared table: a real todo alongside a purchase entry.
      todos: [
        {
          id: 't-1', title: 'Call the supplier', category: 'tc-general',
          done: false, by_id: '', by_name: '', at: stamp, deleted: false, updated_at: stamp,
        },
        {
          id: 'p-1', title: '500g pack', category: 'i1',
          done: false, by_id: 'admin', by_name: 'Admin', at: stamp, deleted: false, updated_at: stamp,
        },
      ],
      todo_categories: [],
    });

    const tree = await mount();
    await openPurchaseList(tree);
    const json = textOf(tree.toJSON());
    expect(json).toContain('Purchase List');
    // The purchase entry resolved against its item, note and all.
    expect(json).toContain('Amul Butter');
    expect(json).toContain('500g pack');
    // ...and the todo row did NOT leak into the restock screen.
    expect(json).not.toContain('Call the supplier');
  });
});
