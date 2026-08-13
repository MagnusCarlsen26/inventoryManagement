import { Todo, TodoCategory } from './types';

/**
 * Seed categories used the first time the todo list is opened (before any sync).
 * These are ordinary categories — an admin can edit or delete them.
 */
export const SEED_TODO_CATEGORIES: TodoCategory[] = [
  { id: 'tc-general', label: 'General', color: '#2D9CDB', tint: '#E4F2FB' },
  { id: 'tc-store', label: 'Store', color: '#27AE60', tint: '#E6F6EC' },
  { id: 'tc-orders', label: 'Orders', color: '#F0932B', tint: '#FDF0E3' },
];

/** Colors handed out to user-created todo categories, in order of creation. */
const PALETTE: Array<Pick<TodoCategory, 'color' | 'tint'>> = [
  { color: '#EB2F96', tint: '#FCE7F2' },
  { color: '#16A085', tint: '#E4F5F0' },
  { color: '#8E6FE0', tint: '#EFEAFB' },
  { color: '#2F80ED', tint: '#E7F0FD' },
  { color: '#E67E22', tint: '#FCF0E4' },
  { color: '#C0392B', tint: '#F9E7E5' },
];

/** Build a config for a user-created todo category. `index` = how many exist already. */
export function makeTodoCategory(label: string, index: number): TodoCategory {
  const p = PALETTE[index % PALETTE.length];
  return {
    id: `tc-${Date.now()}`,
    label: label.trim(),
    color: p.color,
    tint: p.tint,
  };
}

/** Generic last-write-wins merge for rows keyed by id, comparing `updatedAt`. */
export function mergeByUpdatedAt<T extends { id: string; updatedAt?: string }>(
  local: T[],
  remote: T[],
): T[] {
  const map = new Map<string, T>();
  for (const row of local) map.set(row.id, row);
  for (const row of remote) {
    const cur = map.get(row.id);
    if (!cur) {
      map.set(row.id, row);
      continue;
    }
    const a = new Date(row.updatedAt ?? 0).getTime();
    const b = new Date(cur.updatedAt ?? 0).getTime();
    if (a >= b) map.set(row.id, row);
  }
  return [...map.values()];
}

/** Drop soft-deleted rows and sort todos by creation-ish id then title for a stable list. */
export function visibleTodos(todos: Todo[]): Todo[] {
  return todos
    .filter((t) => !t.deleted)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function visibleCategories(categories: TodoCategory[]): TodoCategory[] {
  return categories.filter((c) => !c.deleted);
}
