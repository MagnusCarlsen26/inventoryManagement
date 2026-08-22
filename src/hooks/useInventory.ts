import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  Anchors,
  CategoryConfig,
  CategoryId,
  CheckRecord,
  CheckState,
  Identity,
  Item,
  PurchaseEntry,
  User,
} from '../types';
import { categoryMap, makeCategory, mergeCategories } from '../categories';
import { Cycle, cycleFor } from '../cycles';
import { mergeByUpdatedAt } from '../todos';
import {
  loadState,
  saveAnchors,
  saveCategories,
  saveChecks,
  saveItems,
  savePurchases,
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
  pushPurchase,
  softDeleteItem,
  syncSeed,
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
    const cyc = cycleFor(c, anchors[c.id], now);
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

/** A purchase-list row, resolved against the item and category it points at. */
export interface PurchaseView {
  entry: PurchaseEntry;
  item: Item;
  config: CategoryConfig;
  cycle: Cycle;
}

export function useInventory(identity: Identity | null) {
  const [items, setItems] = useState<Item[]>([]);
  const [checks, setChecks] = useState<CheckState>({});
  const [anchors, setAnchors] = useState<Anchors>({} as Anchors);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  /**
   * Last error from a read or write, or null when the last sync was clean. Pushes are
   * fire-and-forget, so without this a rejected write leaves the row on screen looking
   * saved while the server never received it.
   */
  const [syncError, setSyncError] = useState<string | null>(null);
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
  const purchasesRef = useRef(purchases);
  purchasesRef.current = purchases;

  /** Record a failed write so the header can show it. */
  const noteError = useCallback((e: unknown) => {
    setSyncError(e instanceof Error ? e.message : String(e));
  }, []);

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
      // Purchases are merged rather than server-authoritative so an optimistic add
      // isn't lost to a poll that landed before its push did.
      const mergedPurchases = mergeByUpdatedAt(purchasesRef.current, remote.purchases);
      const r = reconcile(mergedCategories, remote.anchors, mergedChecks, remote.items, now);

      setItems(remote.items);
      setCategories(mergedCategories);
      setAnchors(r.nextAnchors);
      setChecks(r.nextChecks);
      setPurchases(mergedPurchases);
      setUsers(remote.users);

      saveItems(remote.items);
      saveCategories(mergedCategories);
      saveAnchors(r.nextAnchors);
      saveChecks(r.nextChecks);
      savePurchases(mergedPurchases);
      // A purchase-read failure does not stop the rest of the tracker, so it has to be
      // reported here or it goes unnoticed entirely.
      setSyncError(remote.purchaseError ?? null);
      setSyncStatus('synced');
    } catch (e) {
      noteError(e);
      setSyncStatus('offline');
    }
  }, [now, noteError]);

  // Initial load: local cache first (instant), then seed + remote sync.
  useEffect(() => {
    (async () => {
      const s = await loadState();
      const { nextAnchors, nextChecks } = reconcile(s.categories, s.anchors, s.checks, s.items, new Date());
      setItems(s.items);
      setCategories(s.categories);
      setAnchors(nextAnchors);
      setChecks(nextChecks);
      setPurchases(s.purchases);
      setReady(true);
      if (isConfigured) {
        // Awaited: `sync` is server-authoritative for items, so a stale server list
        // would otherwise overwrite the locally-migrated one on the very first poll.
        await syncSeed().catch(() => {});
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
    (cat: CategoryId) => cycleFor(catMap[cat] ?? { days: 1 }, anchors[cat], now).start,
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
      pushCheck(item.id, rec).catch(noteError);
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
      if (changed) pushItem(changed).catch(noteError);
    },
    [canEdit, items, persistItems],
  );

  const persistPurchases = useCallback((next: PurchaseEntry[]) => {
    setPurchases(next);
    savePurchases(next);
  }, []);

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
      // Cascade: the purchase list must never show an entry for a removed item.
      const stamp = new Date().toISOString();
      const orphaned = purchasesRef.current.filter((p) => p.itemId === id && !p.deleted);
      if (orphaned.length) {
        persistPurchases(
          purchasesRef.current.map((p) =>
            p.itemId === id ? { ...p, deleted: true, updatedAt: stamp } : p,
          ),
        );
        for (const p of orphaned) {
          pushPurchase({ ...p, deleted: true, updatedAt: stamp }).catch(noteError);
        }
      }
      softDeleteItem(id).catch(noteError);
    },
    [canEdit, items, persistItems, persistPurchases],
  );

  const addItem = useCallback(
    (name: string, category: CategoryId) => {
      if (!canEdit) return;
      const item: Item = { id: `u-${Date.now()}`, name: name.trim(), category };
      persistItems([...items, item]);
      pushItem(item).catch(noteError);
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
        const a = { ...prev, [cat.id]: cycleFor(cat, new Date().toISOString(), now).start };
        saveAnchors(a);
        pushAnchors({ [cat.id]: a[cat.id] }).catch(noteError);
        return a;
      });
      pushCategory(cat).catch(noteError);
      return cat;
    },
    [categories, now],
  );

  // ---- purchase list --------------------------------------------------------

  /** itemIds with a live (non-deleted) entry — drives the filled cart icon on a row. */
  const purchasedIds = useMemo(
    () => new Set(purchases.filter((p) => !p.deleted).map((p) => p.itemId)),
    [purchases],
  );

  const isOnPurchaseList = useCallback((itemId: string) => purchasedIds.has(itemId), [purchasedIds]);

  /** Flag an item to buy. Staff (approved) and admins both may add. */
  const addPurchase = useCallback(
    (itemId: string, note?: string) => {
      if (!canToggle || !identity) return;
      if (purchasesRef.current.some((p) => p.itemId === itemId && !p.deleted)) return;
      const stamp = new Date().toISOString();
      const entry: PurchaseEntry = {
        id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        itemId,
        note: note?.trim() ? note.trim() : undefined,
        addedById: identity.id,
        addedByName: identity.name,
        addedAt: stamp,
        updatedAt: stamp,
      };
      persistPurchases([...purchasesRef.current, entry]);
      pushPurchase(entry).catch(noteError);
    },
    [canToggle, identity, persistPurchases],
  );

  /** Soft-delete an entry. Admin only. */
  const deletePurchase = useCallback(
    (id: string) => {
      if (!canEdit) return;
      const stamp = new Date().toISOString();
      const target = purchasesRef.current.find((p) => p.id === id);
      if (!target) return;
      persistPurchases(
        purchasesRef.current.map((p) => (p.id === id ? { ...p, deleted: true, updatedAt: stamp } : p)),
      );
      pushPurchase({ ...target, deleted: true, updatedAt: stamp }).catch(noteError);
    },
    [canEdit, persistPurchases],
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
          cycle: cycleFor(c, anchors[c.id], now),
          items: catItems,
          checkedCount: catItems.filter((it) => isChecked(it)).length,
        };
      }),
    [categories, items, anchors, now, isChecked],
  );

  /**
   * Purchase rows in the order they were added — never reordered when ticked, so a
   * row stays exactly where the user last saw it.
   */
  const purchaseViews: PurchaseView[] = useMemo(() => {
    const itemById = new Map(items.map((it) => [it.id, it]));
    return purchases
      .filter((p) => !p.deleted)
      .sort((a, b) => a.addedAt.localeCompare(b.addedAt))
      .map((entry) => {
        const item = itemById.get(entry.itemId);
        const config = item ? catMap[item.category] : undefined;
        if (!item || !config) return null;
        return {
          entry,
          item,
          config,
          cycle: cycleFor(config, anchors[config.id], now),
        };
      })
      .filter((v): v is PurchaseView => v !== null);
  }, [purchases, items, catMap, anchors, now]);

  const purchaseTotals = useMemo(() => {
    const total = purchaseViews.length;
    const bought = purchaseViews.filter((v) => isChecked(v.item)).length;
    return { total, bought };
  }, [purchaseViews, isChecked]);

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
    // purchase list
    purchaseViews,
    purchaseTotals,
    isOnPurchaseList,
    addPurchase,
    deletePurchase,
    // sync
    syncStatus,
    syncError,
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
