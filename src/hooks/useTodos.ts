import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Identity, Todo, TodoCategory } from '../types';
import {
  SEED_TODO_CATEGORIES,
  makeTodoCategory,
  mergeByUpdatedAt,
  visibleCategories,
  visibleTodos,
} from '../todos';
import { loadTodos, saveTodoCategories, saveTodos } from '../storage';
import { isConfigured } from '../supabase';
import { pullTodos, pushTodo, pushTodoCategory } from '../remoteTodos';
import { SyncStatus } from './useInventory';

const SYNC_POLL_MS = 20_000;

export interface TodoCategoryView {
  category: TodoCategory;
  todos: Todo[];
  doneCount: number;
}

export function useTodos(identity: Identity | null) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<TodoCategory[]>(SEED_TODO_CATEGORIES);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const isAdmin = identity?.role === 'admin';
  const canEdit = isAdmin;
  const canToggle = isAdmin || (identity?.role === 'staff' && identity.approved);

  // Latest state in refs so the sync loop reads fresh values without re-subscribing.
  const todosRef = useRef(todos);
  todosRef.current = todos;
  const catsRef = useRef(categories);
  catsRef.current = categories;

  /** Pull server state and merge it into local (last-write-wins by updatedAt). */
  const sync = useCallback(async () => {
    if (!isConfigured) {
      setSyncStatus('offline');
      return;
    }
    setSyncStatus('syncing');
    try {
      const remote = await pullTodos();
      const mergedTodos = mergeByUpdatedAt(todosRef.current, remote.todos);
      const mergedCats = mergeByUpdatedAt(catsRef.current, remote.categories);
      setTodos(mergedTodos);
      setCategories(mergedCats);
      saveTodos(mergedTodos);
      saveTodoCategories(mergedCats);
      setSyncStatus('synced');
    } catch {
      setSyncStatus('offline');
    }
  }, []);

  // Initial load: local cache first, then remote sync.
  useEffect(() => {
    (async () => {
      const s = await loadTodos();
      setTodos(s.todos);
      setCategories(s.categories);
      setReady(true);
      if (isConfigured) sync();
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

  const persistTodos = useCallback((next: Todo[]) => {
    setTodos(next);
    saveTodos(next);
  }, []);

  const persistCategories = useCallback((next: TodoCategory[]) => {
    setCategories(next);
    saveTodoCategories(next);
  }, []);

  const toggleTodo = useCallback(
    (todo: Todo) => {
      if (!canToggle || !identity) return;
      const updated: Todo = {
        ...todo,
        done: !todo.done,
        byId: identity.id,
        byName: identity.name,
        at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persistTodos(todosRef.current.map((t) => (t.id === todo.id ? updated : t)));
      pushTodo(updated).catch(() => {});
    },
    [canToggle, identity, persistTodos],
  );

  const addTodo = useCallback(
    (title: string, category: string) => {
      if (!canEdit) return;
      const todo: Todo = {
        id: `t-${Date.now()}`,
        title: title.trim(),
        category,
        done: false,
        updatedAt: new Date().toISOString(),
      };
      persistTodos([...todosRef.current, todo]);
      pushTodo(todo).catch(() => {});
    },
    [canEdit, persistTodos],
  );

  const updateTodo = useCallback(
    (id: string, patch: Partial<Pick<Todo, 'title' | 'category'>>) => {
      if (!canEdit) return;
      const next = todosRef.current.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
      );
      persistTodos(next);
      const changed = next.find((t) => t.id === id);
      if (changed) pushTodo(changed).catch(() => {});
    },
    [canEdit, persistTodos],
  );

  const deleteTodo = useCallback(
    (id: string) => {
      if (!canEdit) return;
      const changed = todosRef.current.find((t) => t.id === id);
      persistTodos(todosRef.current.map((t) => (t.id === id ? { ...t, deleted: true, updatedAt: new Date().toISOString() } : t)));
      if (changed) pushTodo({ ...changed, deleted: true, updatedAt: new Date().toISOString() }).catch(() => {});
    },
    [canEdit, persistTodos],
  );

  /** Create a category; returns it so callers can auto-select it. */
  const addCategory = useCallback(
    (label: string): TodoCategory => {
      const visibleCount = catsRef.current.filter((c) => !c.deleted).length;
      const cat = { ...makeTodoCategory(label, visibleCount), updatedAt: new Date().toISOString() };
      persistCategories([...catsRef.current, cat]);
      pushTodoCategory(cat).catch(() => {});
      return cat;
    },
    [persistCategories],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      if (!canEdit) return;
      const stamp = new Date().toISOString();
      // Soft-delete the category and every todo under it.
      const changedCat = catsRef.current.find((c) => c.id === id);
      persistCategories(catsRef.current.map((c) => (c.id === id ? { ...c, deleted: true, updatedAt: stamp } : c)));
      const affected = todosRef.current.filter((t) => t.category === id && !t.deleted);
      persistTodos(todosRef.current.map((t) => (t.category === id ? { ...t, deleted: true, updatedAt: stamp } : t)));
      if (changedCat) pushTodoCategory({ ...changedCat, deleted: true, updatedAt: stamp }).catch(() => {});
      for (const t of affected) pushTodo({ ...t, deleted: true, updatedAt: stamp }).catch(() => {});
    },
    [canEdit, persistCategories, persistTodos],
  );

  const cats = useMemo(() => visibleCategories(categories), [categories]);

  const categoryViews: TodoCategoryView[] = useMemo(() => {
    const shown = visibleTodos(todos);
    return cats.map((category) => {
      const catTodos = shown.filter((t) => t.category === category.id);
      return {
        category,
        todos: catTodos,
        doneCount: catTodos.filter((t) => t.done).length,
      };
    });
  }, [cats, todos]);

  const totals = useMemo(() => {
    const shown = visibleTodos(todos);
    return { total: shown.length, done: shown.filter((t) => t.done).length };
  }, [todos]);

  return {
    ready,
    categories: cats,
    categoryViews,
    totals,
    toggleTodo,
    addTodo,
    updateTodo,
    deleteTodo,
    addCategory,
    deleteCategory,
    syncStatus,
    refresh: sync,
    canEdit,
    canToggle,
  };
}
