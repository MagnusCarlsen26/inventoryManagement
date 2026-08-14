/** Was a literal union; now free-form so users can create their own frequencies. */
export type CategoryId = string;

export interface Item {
  id: string;
  name: string;
  category: CategoryId;
  /** ISO timestamp of last edit — used for last-write-wins sync. */
  updatedAt?: string;
  /** soft-delete flag for sync (kept out of the UI). */
  deleted?: boolean;
}

/** A single item's check status, with attribution of who last acted and when. */
export interface CheckRecord {
  /** ISO start-date of the cycle this record is for. */
  cycle: string;
  /** whether the item is currently checked (false = explicitly unchecked). */
  checked: boolean;
  /** id of the user who last toggled it. */
  byId: string;
  /** display name of that user (denormalized so we never need a join). */
  byName: string;
  /** ISO timestamp of the toggle. */
  at: string;
}

/** itemId -> its check record. */
export interface CheckState {
  [itemId: string]: CheckRecord;
}

/** category -> ISO anchor date (a cycle start) that we roll forward over time. */
export type Anchors = Record<CategoryId, string>;

export interface CategoryConfig {
  id: CategoryId;
  label: string;
  /** length of one restock cycle, in whole days */
  days: number;
  color: string;
  tint: string;
  icon: string; // Ionicons name
  /** false / undefined for user-created frequencies (these get persisted). */
  builtin?: boolean;
  updatedAt?: string;
}

/**
 * A "go buy this" flag pinned to the top of the restock tracker, linked to an Item.
 *
 * Deliberately has no `checked` field: the tick is derived from the item's own
 * CheckRecord for the current cycle, so the purchase list and the item's category
 * always agree and a cycle rollover un-ticks both at once.
 */
export interface PurchaseEntry {
  id: string;
  /** Item this entry points at. */
  itemId: string;
  /** Optional free-text note captured when the entry was created. */
  note?: string;
  /** id of the user who added it. */
  addedById: string;
  /** display name of that user (denormalized so we never need a join). */
  addedByName: string;
  /** ISO timestamp of creation — also the list's sort key. */
  addedAt: string;
  /** ISO timestamp of last edit — used for last-write-wins sync. */
  updatedAt?: string;
  /** soft-delete flag for sync (filtered at the view layer). */
  deleted?: boolean;
}

export type Role = 'admin' | 'staff';

/** A staff account row (admins are not stored — they auth via password). */
export interface User {
  id: string;
  name: string;
  role: Role;
  approved: boolean;
  createdAt: string;
}

/** The locally persisted identity of whoever is using this device. */
export interface Identity {
  id: string;
  name: string;
  role: Role;
  approved: boolean;
}

// ---- Todo list (independent from the restock tracker) ---------------------

/** A user-defined bucket that todos are grouped under. */
export interface TodoCategory {
  id: string;
  label: string;
  color: string;
  tint: string;
  /** ISO timestamp of last edit — used for last-write-wins sync. */
  updatedAt?: string;
  /** soft-delete flag for sync (kept out of the UI). */
  deleted?: boolean;
}

/** A single todo, done/not-done, with attribution of who last acted. */
export interface Todo {
  id: string;
  title: string;
  /** TodoCategory id this todo belongs to. */
  category: string;
  done: boolean;
  /** id of the user who last toggled it (empty until toggled). */
  byId?: string;
  /** display name of that user (denormalized so we never need a join). */
  byName?: string;
  /** ISO timestamp of the last toggle. */
  at?: string;
  /** ISO timestamp of last edit — used for last-write-wins sync. */
  updatedAt?: string;
  /** soft-delete flag for sync (kept out of the UI). */
  deleted?: boolean;
}
