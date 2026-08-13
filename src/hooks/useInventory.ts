import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Anchors, CategoryConfig, CategoryId, CheckRecord, CheckState, Identity, Item, User } from '../types';
import { categoryMap, makeCategory, mergeCategories } from '../categories';
import { Cycle, currentCycle } from '../cycles';
import {
  loadState,
  saveAnchors,
  saveCategories,
  saveChecks,
  saveItems,
} from '../storage';
import { isConfigured } from '../supabase';
import {
  approveUser as remoteApproveUser,
  deleteUser as remoteDeleteUser,
  pullAll,
  pushAnchors,
  pushCategory,
  pushCheck,
  pushItem,
  seedIfEmpty,
  softDeleteItem,
} from '../remote';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SYNC_POLL_MS = 20_000;

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline';

/**
 * Roll every category's anchor forward to its live cycle and drop any check that
 * belongs to a cycle other than the current one (auto-uncheck / clear attribution
 * on rollover).
 */
function reconcile(
  categories: CategoryConfig[],
  anchors: Anchors,
  checks: CheckState,
  items: Item[],
  now: Date,
) {
  const nextAnchors: Anchors = { ...anchors };
  const starts = {} as Record<CategoryId, string>;
  for (const c of categories) {
    const cyc = currentCycle(anchors[c.id] ?? new Date().toISOString(), c.days, now);
    nextAnchors[c.id] = cyc.start;
    starts[c.id] = cyc.start;
  }
  const nextChecks: CheckState = {};
  const catOf: Record<string, CategoryId> = {};
  for (const it of items) catOf[it.id] = it.category;
  for (const id of Object.keys(checks)) {
    const cat = catOf[id];
    if (cat && checks[id].cycle === starts[cat]) nextChecks[id] = checks[id];
  }
  const anchorsChanged = categories.some((c) => nextAnchors[c.id] !== anchors[c.id]);
  const checksChanged = Object.keys(nextChecks).length !== Object.keys(checks).length;
  return { nextAnchors, nextChecks, changed: anchorsChanged || checksChanged };
}

/** Merge two check maps, keeping whichever record for an item was toggled most recently. */
function mergeChecks(a: CheckState, b: CheckState): CheckState {
  const out: CheckState = { ...a };
  for (const [id, rec] of Object.entries(b)) {
    const cur = out[id];
    if (!cur || new Date(rec.at).getTime() >= new Date(cur.at).getTime()) out[id] = rec;
  }
  return out;
}

export interface CategoryView {
  id: CategoryId;
  cycle: Cycle;
  items: Item[];
  checkedCount: number;
}

export function useInventory(identity: Identity | null) {
  const [items, setItems] = useState<Item[]>([]);
  const [checks, setChecks] = useState<CheckState>({});
  const [anchors, setAnchors] = useState<Anchors>({} as Anchors);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  // Dev-only: shift "now" forward to watch cycle rollovers.
  const [devOffsetDays, setDevOffsetDays] = useState(0);

  const now = useMemo(() => new Date(Date.now() + devOffsetDays * MS_PER_DAY), [devOffsetDays]);
  const catMap = useMemo(() => categoryMap(categories), [categories]);

  const isAdmin = identity?.role === 'admin';
  const canEdit = isAdmin;
  const canToggle = isAdmin || (identity?.role === 'staff' && identity.approved);

  // Latest state in refs so the sync loop reads fresh values without re-subscribing.
  const checksRef = useRef(checks);
  checksRef.current = checks;

  /** Pull the server state and merge it into local (server-authoritative for items/cats). */
  const sync = useCallback(async () => {
    if (!isConfigured) {
      setSyncStatus('offline');
      return;
    }
    setSyncStatus('syncing');
    try {
      const remote = await pullAll();
      const mergedCategories = mergeCategories(remote.categories);
      const mergedChecks = mergeChecks(checksRef.current, remote.checks);
      const r = reconcile(mergedCategories, remote.anchors, mergedChecks, remote.items, now);

      setItems(remote.items);
      setCategories(mergedCategories);
      setAnchors(r.nextAnchors);
      setChecks(r.nextChecks);
      setUsers(remote.users);

      saveItems(remote.items);
      saveCategories(mergedCategories);
      saveAnchors(r.nextAnchors);
      saveChecks(r.nextChecks);
      setSyncStatus('synced');
    } catch {
      setSyncStatus('offline');
    }
  }, [now]);

  // Initial load: local cache first (instant), then seed + remote sync.
  useEffect(() => {
    (async () => {
      const s = await loadState();
      const { nextAnchors, nextChecks } = reconcile(s.categories, s.anchors, s.checks, s.items, new Date());
      setItems(s.items);
      setCategories(s.categories);
      setAnchors(nextAnchors);
      setChecks(nextChecks);
      setReady(true);
      if (isConfigured) {
        await seedIfEmpty().catch(() => {});
        sync();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll + refetch when the app returns to the foreground.
  useEffect(() => {
    if (!ready || !isConfigured) return;
    const t = setInterval(sync, SYNC_POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') sync();
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [ready, sync]);

  // Re-reconcile when the (dev) clock moves past a cycle boundary.
  useEffect(() => {
    if (!ready) return;
    const { nextAnchors, nextChecks, changed } = reconcile(categories, anchors, checks, items, now);
    if (changed) {
      setAnchors(nextAnchors);
      setChecks(nextChecks);
      saveAnchors(nextAnchors);
      saveChecks(nextChecks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, ready]);

  const cycleStart = useCallback(
    (cat: CategoryId) => currentCycle(anchors[cat], catMap[cat]?.days ?? 1, now).start,
    [anchors, catMap, now],
  );

  const isChecked = useCallback(
    (item: Item) => {
      const rec = checks[item.id];
      return !!rec && rec.checked && rec.cycle === cycleStart(item.category);
    },
    [checks, cycleStart],
  );

  /** Attribution for the current cycle, if any action has been recorded. */
  const checkInfo = useCallback(
    (item: Item): CheckRecord | undefined => {
      const rec = checks[item.id];
      return rec && rec.cycle === cycleStart(item.category) ? rec : undefined;
    },
    [checks, cycleStart],
  );

  const toggle = useCallback(
    (item: Item) => {
      if (!canToggle || !identity) return;
      const start = cycleStart(item.category);
      const prev = checks[item.id];
      const wasChecked = !!prev && prev.checked && prev.cycle === start;
      const rec: CheckRecord = {
        cycle: start,
        checked: !wasChecked,
        byId: identity.id,
        byName: identity.name,
        at: new Date().toISOString(),
      };
      setChecks((p) => {
        const next = { ...p, [item.id]: rec };
        saveChecks(next);
        return next;
      });
      pushCheck(item.id, rec).catch(() => {});
    },
    [canToggle, identity, checks, cycleStart],
  );

  const persistItems = useCallback((next: Item[]) => {
    setItems(next);
    saveItems(next);
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<Pick<Item, 'name' | 'category'>>) => {
      if (!canEdit) return;
      const next = items.map((it) => (it.id === id ? { ...it, ...patch } : it));
      persistItems(next);
      const changed = next.find((it) => it.id === id);
      if (changed) pushItem(changed).catch(() => {});
    },
    [canEdit, items, persistItems],
  );

  const deleteItem = useCallback(
    (id: string) => {
      if (!canEdit) return;
      persistItems(items.filter((it) => it.id !== id));
      setChecks((prev) => {
        const next = { ...prev };
        delete next[id];
        saveChecks(next);
        return next;
      });
      softDeleteItem(id).catch(() => {});
    },
    [canEdit, items, persistItems],
  );

  const addItem = useCallback(
    (name: string, category: CategoryId) => {
      if (!canEdit) return;
      const item: Item = { id: `u-${Date.now()}`, name: name.trim(), category };
      persistItems([...items, item]);
      pushItem(item).catch(() => {});
    },
    [canEdit, items, persistItems],
  );

  /** Create a user-defined frequency; returns the new category so callers can select it. */
  const addCategory = useCallback(
    (label: string, days: number): CategoryConfig => {
      const customCount = categories.filter((c) => !c.builtin).length;
      const cat = makeCategory(label, days, customCount);
      const next = [...categories, cat].sort((a, b) => a.days - b.days);
      setCategories(next);
      saveCategories(next);
      setAnchors((prev) => {
        const a = { ...prev, [cat.id]: currentCycle(new Date().toISOString(), cat.days, now).start };
        saveAnchors(a);
        pushAnchors({ [cat.id]: a[cat.id] }).catch(() => {});
        return a;
      });
      pushCategory(cat).catch(() => {});
      return cat;
    },
    [categories, now],
  );

  // ---- admin user management ----
  const approveUser = useCallback(async (id: string) => {
    await remoteApproveUser(id);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, approved: true } : u)));
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    await remoteDeleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const categoryViews: CategoryView[] = useMemo(
    () =>
      categories.map((c) => {
        const catItems = items
          .filter((it) => it.category === c.id)
          .sort((a, b) => a.name.localeCompare(b.name));
        return {
          id: c.id,
          cycle: currentCycle(anchors[c.id] ?? new Date().toISOString(), c.days, now),
          items: catItems,
          checkedCount: catItems.filter((it) => isChecked(it)).length,
        };
      }),
    [categories, items, anchors, now, isChecked],
  );

  const totals = useMemo(() => {
    const total = items.length;
    const checked = items.filter((it) => isChecked(it)).length;
    return { total, checked };
  }, [items, isChecked]);

  return {
    ready,
    now,
    categories,
    categoryMap: catMap,
    categoryViews,
    totals,
    isChecked,
    checkInfo,
    toggle,
    updateItem,
    deleteItem,
    addItem,
    addCategory,
    // sync
    syncStatus,
    refresh: sync,
    // roles
    canEdit,
    canToggle,
    // users (admin)
    users,
    approveUser,
    deleteUser,
    // dev
    devOffsetDays,
    setDevOffsetDays,
  };
}
