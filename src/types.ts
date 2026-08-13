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
