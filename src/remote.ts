import { supabase } from './supabase';
import { Anchors, CategoryConfig, CheckRecord, CheckState, Item, PurchaseEntry, User } from './types';
import { SEED_ITEMS, SEED_VERSION, reviseSeed } from './seedItems';
import { BUILTIN_CATEGORIES } from './categories';
import { todayISO } from './cycles';

/** Everything the app pulls from the server in one sync. */
export interface RemoteState {
  items: Item[];
  /** custom (non-builtin) categories only — builtins live in code. */
  categories: CategoryConfig[];
  anchors: Anchors;
  checks: CheckState;
  users: User[];
  /** Includes soft-deleted rows — filtered at the view layer so deletes propagate. */
  purchases: PurchaseEntry[];
  /**
   * Why the purchase read failed, if it did. The rest of the tracker still syncs when
   * this is set (see `pullAll`), but the caller must surface it — a purchase list that
   * silently stops syncing is indistinguishable from one nobody has added to.
   */
  purchaseError?: string;
}

const nowISO = () => new Date().toISOString();

/**
 * supabase-js resolves with `{ error }` rather than rejecting, so an unchecked call
 * looks successful no matter what the server said. Every write goes through this.
 */
export function must<T extends { error: unknown }>(res: T): T {
  const e = res.error as { message?: string } | null;
  if (e) throw new Error(e.message ?? String(e));
  return res;
}

/**
 * Where purchase-list entries are stored remotely.
 *
 * They ride in the `todos` table rather than a table of their own, because creating
 * one needs DDL access the app doesn't have (it ships the anon key, which cannot
 * create tables). The columns line up cleanly — see `toPurchaseRow` — and entries are
 * marked by a `p-` id prefix, which `pullTodos` filters out so they never surface on
 * the todo screen.
 *
 * To move onto the dedicated `purchase_entries` table already defined in
 * supabase-setup.sql: run that SQL, copy the `p-` rows across, then point this
 * constant at it and drop the prefix filters in `isPurchaseRow` and `pullTodos`.
 */
const PURCHASE_TABLE = 'todos';

/** Purchase entries are the `p-`-prefixed rows; todos proper are everything else. */
export const isPurchaseRow = (id: unknown) => String(id ?? '').startsWith('p-');

/**
 * Reserved `anchors` row recording which SEED_VERSION the shared database is on.
 *
 * It rides in `anchors` for the same reason purchase entries ride in `todos`: adding a
 * table needs DDL access the app doesn't have. `category_id` can never collide with a
 * real category — built-in ids are fixed and custom ones are `c-`-prefixed — and
 * `pullAll` keeps the row out of the anchor map so it is never mistaken for a cycle.
 */
const SEED_VERSION_KEY = '__seed_version';

// ---- pull -----------------------------------------------------------------

export async function pullAll(): Promise<RemoteState> {
  const [items, categories, anchors, checks, users, purchases] = await Promise.all([
    supabase.from('items').select('*'),
    supabase.from('categories').select('*'),
    supabase.from('anchors').select('*'),
    supabase.from('checks').select('*'),
    supabase.from('users').select('*'),
    supabase.from(PURCHASE_TABLE).select('*'),
  ]);

  // The purchase read is deliberately left out of this check so a failure there can
  // never stop the rest of the tracker from syncing — it is reported via
  // `purchaseError` instead of being swallowed.
  const err = items.error || categories.error || anchors.error || checks.error || users.error;
  if (err) throw err;

  const checkState: CheckState = {};
  for (const r of checks.data ?? []) {
    checkState[r.item_id] = {
      cycle: r.cycle,
      checked: !!r.checked,
      byId: r.by_id ?? '',
      byName: r.by_name ?? '',
      at: r.at ?? nowISO(),
    };
  }

  const anchorMap: Anchors = {};
  for (const r of anchors.data ?? []) {
    if (r.category_id === SEED_VERSION_KEY) continue; // bookkeeping row, not a cycle anchor
    anchorMap[r.category_id] = r.anchor;
  }

  return {
    items: (items.data ?? [])
      .filter((r: any) => !r.deleted)
      .map((r: any) => ({ id: r.id, name: r.name, category: r.category, updatedAt: r.updated_at })),
    categories: (categories.data ?? [])
      .filter((r: any) => !r.deleted)
      .map((r: any) => ({
        id: r.id,
        label: r.label,
        days: r.days,
        color: r.color,
        tint: r.tint,
        icon: r.icon,
        builtin: false,
        updatedAt: r.updated_at,
      })),
    anchors: anchorMap,
    checks: checkState,
    users: (users.data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      approved: !!r.approved,
      createdAt: r.created_at,
    })),
    purchaseError: purchases.error ? purchases.error.message : undefined,
    purchases: (purchases.data ?? []).filter((r: any) => isPurchaseRow(r.id)).map((r: any) => ({
      id: r.id,
      // `category` carries the linked item id; `title` carries the optional note.
      itemId: r.category,
      note: r.title ? r.title : undefined,
      addedById: r.by_id ?? '',
      addedByName: r.by_name ?? '',
      addedAt: r.at ?? r.updated_at ?? nowISO(),
      updatedAt: r.updated_at,
      deleted: !!r.deleted,
    })),
  };
}

// ---- push ------------------------------------------------------------------
//
// Every write is wrapped in `must` so a server rejection rejects the promise. Callers
// still fire-and-forget, but they now attach a handler that surfaces the failure
// rather than discarding it.

export async function pushItem(item: Item) {
  must(
    await supabase.from('items').upsert({
      id: item.id,
      name: item.name,
      category: item.category,
      deleted: false,
      updated_at: nowISO(),
    }),
  );
}

export async function softDeleteItem(id: string) {
  must(await supabase.from('items').upsert({ id, deleted: true, updated_at: nowISO() }));
  must(await supabase.from('checks').delete().eq('item_id', id));
}

export async function pushCategory(cat: CategoryConfig) {
  must(
    await supabase.from('categories').upsert({
      id: cat.id,
      label: cat.label,
      days: cat.days,
      color: cat.color,
      tint: cat.tint,
      icon: cat.icon,
      deleted: false,
      updated_at: nowISO(),
    }),
  );
}

export async function pushAnchors(anchors: Anchors) {
  const rows = Object.entries(anchors).map(([category_id, anchor]) => ({
    category_id,
    anchor,
    updated_at: nowISO(),
  }));
  if (rows.length) must(await supabase.from('anchors').upsert(rows));
}

export async function pushCheck(itemId: string, rec: CheckRecord) {
  must(
    await supabase.from('checks').upsert({
      item_id: itemId,
      cycle: rec.cycle,
      checked: rec.checked,
      by_id: rec.byId,
      by_name: rec.byName,
      at: rec.at,
      updated_at: nowISO(),
    }),
  );
}

/** Upsert a purchase-list entry (also how a soft delete is pushed). */
export async function pushPurchase(entry: PurchaseEntry) {
  must(await supabase.from(PURCHASE_TABLE).upsert(toPurchaseRow(entry)));
}

/**
 * Map an entry onto the `todos` column layout:
 *   title → the note        category → the linked item id
 *   by_id/by_name/at → who added it and when
 * `done` is always false: a purchase row's tick is the linked item's own check record
 * for the current cycle, never a column here.
 */
function toPurchaseRow(entry: PurchaseEntry) {
  return {
    id: entry.id,
    title: entry.note ?? '',
    category: entry.itemId,
    done: false,
    by_id: entry.addedById,
    by_name: entry.addedByName,
    at: entry.addedAt,
    deleted: !!entry.deleted,
    updated_at: entry.updatedAt ?? nowISO(),
  };
}

// ---- users ----------------------------------------------------------------

export async function registerStaff(id: string, name: string) {
  must(
    await supabase.from('users').insert({
      id,
      name,
      role: 'staff',
      approved: false,
      created_at: nowISO(),
    }),
  );
}

export async function fetchUser(id: string): Promise<User | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    role: data.role,
    approved: !!data.approved,
    createdAt: data.created_at,
  };
}

export async function approveUser(id: string) {
  must(await supabase.from('users').update({ approved: true }).eq('id', id));
}

export async function deleteUser(id: string) {
  must(await supabase.from('users').delete().eq('id', id));
}

// ---- seeding & seed-list migrations ---------------------------------------

const itemRow = (it: Item, stamp: string) => ({
  id: it.id,
  name: it.name,
  category: it.category,
  deleted: false,
  updated_at: stamp,
});

/**
 * Bring the shared database onto the current seed list.
 *
 * An empty database is seeded outright. An already-populated one is reconciled when its
 * recorded seed version has fallen behind: every current seed item is upserted onto its
 * listed name and frequency, and rows this app seeded that the client has since dropped
 * are soft-deleted along with their checks. Items staff added in-app (`u-` ids) are left
 * alone, and purchase-list entries pointing at a removed item simply stop resolving —
 * `purchaseViews` filters those out.
 *
 * Safe to run on every launch: it no-ops once the version row is current.
 */
export async function syncSeed() {
  const [items, version] = await Promise.all([
    supabase.from('items').select('id,deleted'),
    supabase.from('anchors').select('anchor').eq('category_id', SEED_VERSION_KEY).maybeSingle(),
  ]);
  if (items.error) return;

  const rows = items.data ?? [];
  const remoteVersion = Number(version.data?.anchor ?? 0);
  if (rows.length > 0 && remoteVersion >= SEED_VERSION) return;

  const stamp = nowISO();

  if (rows.length === 0) {
    await supabase.from('items').insert(SEED_ITEMS.map((it) => itemRow(it, stamp)));
    const t = todayISO();
    await supabase.from('anchors').upsert(
      BUILTIN_CATEGORIES.map((c) => ({ category_id: c.id, anchor: t, updated_at: stamp })),
    );
  } else {
    const { upserts, staleIds } = reviseSeed(rows.filter((r: any) => !r.deleted));
    await supabase.from('items').upsert(upserts.map((it) => itemRow(it, stamp)));
    if (staleIds.length) {
      await supabase
        .from('items')
        .upsert(staleIds.map((id) => ({ id, deleted: true, updated_at: stamp })));
      await supabase.from('checks').delete().in('item_id', staleIds);
    }
  }

  await supabase
    .from('anchors')
    .upsert({ category_id: SEED_VERSION_KEY, anchor: String(SEED_VERSION), updated_at: stamp });
}
