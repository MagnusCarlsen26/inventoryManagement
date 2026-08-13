import { supabase } from './supabase';
import { Anchors, CategoryConfig, CheckRecord, CheckState, Item, User } from './types';
import { SEED_ITEMS } from './seedItems';
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
}

const nowISO = () => new Date().toISOString();

// ---- pull -----------------------------------------------------------------

export async function pullAll(): Promise<RemoteState> {
  const [items, categories, anchors, checks, users] = await Promise.all([
    supabase.from('items').select('*'),
    supabase.from('categories').select('*'),
    supabase.from('anchors').select('*'),
    supabase.from('checks').select('*'),
    supabase.from('users').select('*'),
  ]);

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
  for (const r of anchors.data ?? []) anchorMap[r.category_id] = r.anchor;

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
  };
}

// ---- push (fire-and-forget from callers) ----------------------------------

export async function pushItem(item: Item) {
  await supabase.from('items').upsert({
    id: item.id,
    name: item.name,
    category: item.category,
    deleted: false,
    updated_at: nowISO(),
  });
}

export async function softDeleteItem(id: string) {
  await supabase.from('items').upsert({ id, deleted: true, updated_at: nowISO() });
  await supabase.from('checks').delete().eq('item_id', id);
}

export async function pushCategory(cat: CategoryConfig) {
  await supabase.from('categories').upsert({
    id: cat.id,
    label: cat.label,
    days: cat.days,
    color: cat.color,
    tint: cat.tint,
    icon: cat.icon,
    deleted: false,
    updated_at: nowISO(),
  });
}

export async function pushAnchors(anchors: Anchors) {
  const rows = Object.entries(anchors).map(([category_id, anchor]) => ({
    category_id,
    anchor,
    updated_at: nowISO(),
  }));
  if (rows.length) await supabase.from('anchors').upsert(rows);
}

export async function pushCheck(itemId: string, rec: CheckRecord) {
  await supabase.from('checks').upsert({
    item_id: itemId,
    cycle: rec.cycle,
    checked: rec.checked,
    by_id: rec.byId,
    by_name: rec.byName,
    at: rec.at,
    updated_at: nowISO(),
  });
}

// ---- users ----------------------------------------------------------------

export async function registerStaff(id: string, name: string) {
  await supabase.from('users').insert({
    id,
    name,
    role: 'staff',
    approved: false,
    created_at: nowISO(),
  });
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
  await supabase.from('users').update({ approved: true }).eq('id', id);
}

export async function deleteUser(id: string) {
  await supabase.from('users').delete().eq('id', id);
}

// ---- first-run seeding ----------------------------------------------------

/** If the items table is empty, seed it with SEED_ITEMS + fresh builtin anchors. */
export async function seedIfEmpty() {
  const { count, error } = await supabase
    .from('items')
    .select('id', { count: 'exact', head: true });
  if (error || (count ?? 0) > 0) return;

  const t = todayISO();
  const stamp = nowISO();
  await supabase.from('items').insert(
    SEED_ITEMS.map((it) => ({
      id: it.id,
      name: it.name,
      category: it.category,
      deleted: false,
      updated_at: stamp,
    })),
  );
  await supabase.from('anchors').upsert(
    BUILTIN_CATEGORIES.map((c) => ({ category_id: c.id, anchor: t, updated_at: stamp })),
  );
}
