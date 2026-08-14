import { supabase } from './supabase';
import { isPurchaseRow } from './remote';
import { Todo, TodoCategory } from './types';

/** Everything the todo list pulls from the server in one sync. */
export interface RemoteTodos {
  todos: Todo[];
  categories: TodoCategory[];
}

const nowISO = () => new Date().toISOString();

// ---- pull -----------------------------------------------------------------

export async function pullTodos(): Promise<RemoteTodos> {
  const [todos, categories] = await Promise.all([
    supabase.from('todos').select('*'),
    supabase.from('todo_categories').select('*'),
  ]);

  const err = todos.error || categories.error;
  if (err) throw err;

  return {
    // Restock purchase-list entries share this table (see PURCHASE_TABLE in remote.ts).
    // Dropping them here keeps them out of the todo feature's state entirely, so they
    // never render in a category or count towards its totals.
    todos: (todos.data ?? []).filter((r: any) => !isPurchaseRow(r.id)).map((r: any) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      done: !!r.done,
      byId: r.by_id ?? '',
      byName: r.by_name ?? '',
      at: r.at ?? undefined,
      updatedAt: r.updated_at,
      deleted: !!r.deleted,
    })),
    categories: (categories.data ?? []).map((r: any) => ({
      id: r.id,
      label: r.label,
      color: r.color,
      tint: r.tint,
      updatedAt: r.updated_at,
      deleted: !!r.deleted,
    })),
  };
}

// ---- push (fire-and-forget from callers) ----------------------------------

export async function pushTodo(todo: Todo) {
  await supabase.from('todos').upsert({
    id: todo.id,
    title: todo.title,
    category: todo.category,
    done: todo.done,
    by_id: todo.byId ?? '',
    by_name: todo.byName ?? '',
    at: todo.at ?? null,
    deleted: !!todo.deleted,
    updated_at: todo.updatedAt ?? nowISO(),
  });
}

export async function pushTodoCategory(cat: TodoCategory) {
  await supabase.from('todo_categories').upsert({
    id: cat.id,
    label: cat.label,
    color: cat.color,
    tint: cat.tint,
    deleted: !!cat.deleted,
    updated_at: cat.updatedAt ?? nowISO(),
  });
}
