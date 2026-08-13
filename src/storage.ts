import AsyncStorage from '@react-native-async-storage/async-storage';
import { Anchors, CategoryConfig, CheckRecord, CheckState, Identity, Item } from './types';
import { SEED_ITEMS } from './seedItems';
import { mergeCategories } from './categories';
import { todayISO } from './cycles';

const K_ITEMS = 'inv:items';
const K_CHECKS = 'inv:checks';
const K_ANCHORS = 'inv:anchors';
const K_CATEGORIES = 'inv:categories';
const K_IDENTITY = 'inv:identity';

export interface PersistedState {
  items: Item[];
  checks: CheckState;
  anchors: Anchors;
  categories: CategoryConfig[];
}

function freshAnchors(categories: CategoryConfig[]): Anchors {
  const t = todayISO();
  return categories.reduce((acc, c) => ((acc[c.id] = t), acc), {} as Anchors);
}

/** Migrate legacy `{ itemId: cycleISO }` checks to the attributed CheckRecord shape. */
function normalizeChecks(raw: any): CheckState {
  const out: CheckState = {};
  if (!raw || typeof raw !== 'object') return out;
  const now = new Date().toISOString();
  for (const [id, v] of Object.entries(raw)) {
    if (typeof v === 'string') {
      out[id] = { cycle: v, checked: true, byId: '', byName: '—', at: now };
    } else if (v && typeof v === 'object' && typeof (v as any).cycle === 'string') {
      const r = v as CheckRecord;
      out[id] = {
        cycle: r.cycle,
        checked: r.checked !== false,
        byId: r.byId ?? '',
        byName: r.byName ?? '—',
        at: r.at ?? now,
      };
    }
  }
  return out;
}

export async function loadState(): Promise<PersistedState> {
  const [itemsRaw, checksRaw, anchorsRaw, categoriesRaw] = await Promise.all([
    AsyncStorage.getItem(K_ITEMS),
    AsyncStorage.getItem(K_CHECKS),
    AsyncStorage.getItem(K_ANCHORS),
    AsyncStorage.getItem(K_CATEGORIES),
  ]);

  const custom: CategoryConfig[] = categoriesRaw ? JSON.parse(categoriesRaw) : [];
  const categories = mergeCategories(custom);

  const items: Item[] = itemsRaw ? JSON.parse(itemsRaw) : SEED_ITEMS;
  const checks: CheckState = normalizeChecks(checksRaw ? JSON.parse(checksRaw) : {});
  // Merge so any category (built-in or custom) missing an anchor gets today's.
  const anchors: Anchors = { ...freshAnchors(categories), ...(anchorsRaw ? JSON.parse(anchorsRaw) : {}) };

  if (!itemsRaw) await AsyncStorage.setItem(K_ITEMS, JSON.stringify(items));
  await AsyncStorage.setItem(K_ANCHORS, JSON.stringify(anchors));

  return { items, checks, anchors, categories };
}

export const saveItems = (items: Item[]) => AsyncStorage.setItem(K_ITEMS, JSON.stringify(items));
export const saveChecks = (checks: CheckState) => AsyncStorage.setItem(K_CHECKS, JSON.stringify(checks));
export const saveAnchors = (anchors: Anchors) => AsyncStorage.setItem(K_ANCHORS, JSON.stringify(anchors));
/** Persist only user-created frequencies; built-ins live in code. */
export const saveCategories = (categories: CategoryConfig[]) =>
  AsyncStorage.setItem(K_CATEGORIES, JSON.stringify(categories.filter((c) => !c.builtin)));

// ---- identity -------------------------------------------------------------

export async function loadIdentity(): Promise<Identity | null> {
  const raw = await AsyncStorage.getItem(K_IDENTITY);
  return raw ? (JSON.parse(raw) as Identity) : null;
}
export const saveIdentity = (id: Identity) => AsyncStorage.setItem(K_IDENTITY, JSON.stringify(id));
export const clearIdentity = () => AsyncStorage.removeItem(K_IDENTITY);
