import React, { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Todo } from '../types';
import { TodoCategoryView } from '../hooks/useTodos';
import ProgressRing from './ProgressRing';
import TodoRow from './TodoRow';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  view: TodoCategoryView;
  now: Date;
  canEdit: boolean;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDeleteCategory: (id: string) => void;
}

export default function TodoCategorySection({ view, now, canEdit, onToggle, onEdit, onDeleteCategory }: Props) {
  const [open, setOpen] = useState(true);
  const { category, todos, doneCount } = view;
  const total = todos.length;
  const progress = total ? doneCount / total : 0;

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={toggleOpen} style={styles.header}>
        <ProgressRing progress={progress} color={category.color} label={`${doneCount}/${total}`} />
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <View style={[styles.dot, { backgroundColor: category.color }]} />
            <Text style={styles.title}>{category.label}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: category.tint }]}>
            <Ionicons name="list" size={11} color={category.color} />
            <Text style={[styles.pillText, { color: category.color }]}>
              {total} {total === 1 ? 'task' : 'tasks'}
            </Text>
          </View>
        </View>
        {canEdit && (
          <Pressable hitSlop={10} onPress={() => onDeleteCategory(category.id)} style={styles.trash}>
            <Ionicons name="trash-outline" size={18} color="#CBD2D9" />
          </Pressable>
        )}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#B0B7C0" />
      </Pressable>

      {open && (
        <View style={styles.list}>
          {total === 0 ? (
            <Text style={styles.empty}>No tasks here yet.</Text>
          ) : (
            todos.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                color={category.color}
                canEdit={canEdit}
                now={now}
                onToggle={onToggle}
                onEdit={onEdit}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#1F2933',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  headerText: { flex: 1, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 17, fontWeight: '700', color: '#1F2933' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: { fontSize: 12, fontWeight: '600' },
  trash: { padding: 4 },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EDF0F3' },
  empty: { padding: 16, color: '#9AA5B1', fontStyle: 'italic' },
});
