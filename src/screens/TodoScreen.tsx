import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTodos } from '../hooks/useTodos';
import { Identity, Todo } from '../types';
import TodoCategorySection from '../components/TodoCategorySection';
import EditTodoSheet from '../components/EditTodoSheet';
import { SYNC_META } from './syncMeta';

interface Props {
  todos: ReturnType<typeof useTodos>;
  identity: Identity;
  now: Date;
  onMenu: () => void;
  onOpenProfile: () => void;
  onRefresh: () => Promise<void>;
}

export default function TodoScreen({ todos, identity, now, onMenu, onOpenProfile, onRefresh }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [addCategory, setAddCategory] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = identity.role === 'admin';
  const pendingApproval = identity.role === 'staff' && !identity.approved;

  const openEdit = (todo: Todo) => {
    setEditing(todo);
    setAddCategory(undefined);
    setSheetOpen(true);
  };
  const openAdd = () => {
    setEditing(null);
    setAddCategory(todos.categories[0]?.id);
    setSheetOpen(true);
  };
  const onSave = (title: string, category: string) => {
    if (editing) todos.updateTodo(editing.id, { title, category });
    else todos.addTodo(title, category);
  };
  const refresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  if (!todos.ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1F2933" />
      </View>
    );
  }

  const { total, done } = todos.totals;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const sync = SYNC_META[todos.syncStatus] ?? SYNC_META.idle;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1F2933" />}
      >
        <View style={styles.header}>
          <View style={styles.topRow}>
            <Pressable style={styles.iconBtn} onPress={onMenu}>
              <Ionicons name="menu" size={24} color="#1F2933" />
            </Pressable>
            <View style={styles.flex}>
              <Text style={styles.kicker}>TASKS</Text>
              <Text style={styles.title}>To-do</Text>
            </View>
            <Pressable style={styles.iconBtn} onPress={onOpenProfile}>
              <Ionicons name="person-circle-outline" size={24} color="#1F2933" />
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.rolePill, isAdmin ? styles.adminPill : styles.staffPill]}>
              <Ionicons
                name={isAdmin ? 'shield-checkmark' : 'person'}
                size={12}
                color={isAdmin ? '#8E6FE0' : '#2D9CDB'}
              />
              <Text style={[styles.rolePillText, { color: isAdmin ? '#8E6FE0' : '#2D9CDB' }]}>
                {isAdmin ? 'Admin' : identity.name}
              </Text>
            </View>
            <View style={styles.syncPill}>
              <View style={[styles.syncDot, { backgroundColor: sync.color }]} />
              <Text style={styles.syncText}>{sync.label}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryBar}>
              <View style={[styles.summaryFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.summaryText}>
              {done} / {total} done
            </Text>
          </View>
        </View>

        {pendingApproval && (
          <View style={styles.banner}>
            <Ionicons name="hourglass-outline" size={18} color="#F0932B" />
            <Text style={styles.bannerText}>
              Waiting for an admin to approve your access. You can view tasks but can't check them off yet.
            </Text>
          </View>
        )}

        {todos.categoryViews.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkbox-outline" size={40} color="#CBD2D9" />
            <Text style={styles.emptyTitle}>No categories yet</Text>
            <Text style={styles.emptyBody}>
              {isAdmin ? 'Tap + to add your first task and category.' : 'An admin hasn’t added any tasks yet.'}
            </Text>
          </View>
        ) : (
          todos.categoryViews.map((view) => (
            <TodoCategorySection
              key={view.category.id}
              view={view}
              now={now}
              canEdit={todos.canEdit}
              onToggle={todos.toggleTodo}
              onEdit={openEdit}
              onDeleteCategory={todos.deleteCategory}
            />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {todos.canEdit && (
        <Pressable style={styles.fab} onPress={openAdd}>
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      )}

      <EditTodoSheet
        visible={sheetOpen}
        todo={editing}
        categories={todos.categories}
        defaultCategory={addCategory}
        onClose={() => setSheetOpen(false)}
        onSave={onSave}
        onAddCategory={todos.addCategory}
        onDelete={todos.deleteTodo}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6F8' },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F8' },
  scroll: { paddingTop: 8 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: '#9AA5B1' },
  title: { fontSize: 30, fontWeight: '800', color: '#1F2933', marginTop: 2 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E4E7EB',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  adminPill: { backgroundColor: '#EFEAFB' },
  staffPill: { backgroundColor: '#E4F2FB' },
  rolePillText: { fontSize: 13, fontWeight: '700' },
  syncPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5 },
  syncDot: { width: 8, height: 8, borderRadius: 4 },
  syncText: { fontSize: 12, fontWeight: '600', color: '#9AA5B1' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  summaryBar: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#E4E7EB', overflow: 'hidden' },
  summaryFill: { height: '100%', borderRadius: 5, backgroundColor: '#27AE60' },
  summaryText: { fontSize: 13, fontWeight: '700', color: '#616E7C' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FDF0E3',
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
  },
  bannerText: { flex: 1, fontSize: 13, color: '#8A5A1E', fontWeight: '500', lineHeight: 18 },
  emptyState: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 40, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#616E7C', marginTop: 4 },
  emptyBody: { fontSize: 14, color: '#9AA5B1', textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1F2933',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F2933',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
