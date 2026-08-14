import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Anchors,
  CategoryConfig,
  CheckRecord,
  CheckState,
  Identity,
  Item,
  PurchaseEntry,
  Todo,
  TodoCategory,
} from './types';
import { SEED_ITEMS } from './seedItems';
import { mergeCategories } from './categories';
import { SEED_TODO_CATEGORIES } from './todos';
import { todayISO } from './cycles';

const K_ITEMS = 'inv:items';
const K_CHECKS = 'inv:checks';
const K_ANCHORS = 'inv:anchors';
const K_CATEGORIES = 'inv:categories';
const K_PURCHASES = 'inv:purchases';
const K_IDENTITY = 'inv:identity';
const K_TODOS = 'todo:todos';
const K_TODO_CATEGORIES = 'todo:categories';

export interface PersistedState {
  items: Item[];
  checks: CheckState;
  anchors: Anchors;
  categories: CategoryConfig[];
  purchases: PurchaseEntry[];
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
  const [itemsRaw, checksRaw, anchorsRaw, categoriesRaw, purchasesRaw] = await Promise.all([
    AsyncStorage.getItem(K_ITEMS),
    AsyncStorage.getItem(K_CHECKS),
    AsyncStorage.getItem(K_ANCHORS),
    AsyncStorage.getItem(K_CATEGORIES),
    AsyncStorage.getItem(K_PURCHASES),
  ]);

  const custom: CategoryConfig[] = categoriesRaw ? JSON.parse(categoriesRaw) : [];
  const categories = mergeCategories(custom);

  const items: Item[] = itemsRaw ? JSON.parse(itemsRaw) : SEED_ITEMS;
  const checks: CheckState = normalizeChecks(checksRaw ? JSON.parse(checksRaw) : {});
  // Merge so any category (built-in or custom) missing an anchor gets today's.
  const anchors: Anchors = { ...freshAnchors(categories), ...(anchorsRaw ? JSON.parse(anchorsRaw) : {}) };
  const purchases: PurchaseEntry[] = purchasesRaw ? JSON.parse(purchasesRaw) : [];

  if (!itemsRaw) await AsyncStorage.setItem(K_ITEMS, JSON.stringify(items));
  await AsyncStorage.setItem(K_ANCHORS, JSON.stringify(anchors));

  return { items, checks, anchors, categories, purchases };
}

export const saveItems = (items: Item[]) => AsyncStorage.setItem(K_ITEMS, JSON.stringify(items));
export const saveChecks = (checks: CheckState) => AsyncStorage.setItem(K_CHECKS, JSON.stringify(checks));
export const saveAnchors = (anchors: Anchors) => AsyncStorage.setItem(K_ANCHORS, JSON.stringify(anchors));
/** Persist only user-created frequencies; built-ins live in code. */
export const saveCategories = (categories: CategoryConfig[]) =>
  AsyncStorage.setItem(K_CATEGORIES, JSON.stringify(categories.filter((c) => !c.builtin)));
/** Soft-deleted entries are kept locally so a delete survives until the next sync. */
export const savePurchases = (purchases: PurchaseEntry[]) =>
  AsyncStorage.setItem(K_PURCHASES, JSON.stringify(purchases));

// ---- todo list ------------------------------------------------------------

export interface PersistedTodos {
  todos: Todo[];
  categories: TodoCategory[];
}

export async function loadTodos(): Promise<PersistedTodos> {
  const [todosRaw, catsRaw] = await Promise.all([
    AsyncStorage.getItem(K_TODOS),
    AsyncStorage.getItem(K_TODO_CATEGORIES),
  ]);
  const todos: Todo[] = todosRaw ? JSON.parse(todosRaw) : [];
  const categories: TodoCategory[] = catsRaw ? JSON.parse(catsRaw) : SEED_TODO_CATEGORIES;
  if (!catsRaw) await AsyncStorage.setItem(K_TODO_CATEGORIES, JSON.stringify(categories));
  return { todos, categories };
}

export const saveTodos = (todos: Todo[]) => AsyncStorage.setItem(K_TODOS, JSON.stringify(todos));
export const saveTodoCategories = (categories: TodoCategory[]) =>
  AsyncStorage.setItem(K_TODO_CATEGORIES, JSON.stringify(categories));

// ---- identity -------------------------------------------------------------

export async function loadIdentity(): Promise<Identity | null> {
  const raw = await AsyncStorage.getItem(K_IDENTITY);
  return raw ? (JSON.parse(raw) as Identity) : null;
}
export const saveIdentity = (id: Identity) => AsyncStorage.setItem(K_IDENTITY, JSON.stringify(id));
export const clearIdentity = () => AsyncStorage.removeItem(K_IDENTITY);
