import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Todo } from '../types';
import { relativeTime } from '../time';
import Checkbox from './Checkbox';

interface Props {
  todo: Todo;
  color: string;
  canEdit: boolean;
  now: Date;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
}

function TodoRow({ todo, color, canEdit, now, onToggle, onEdit }: Props) {
  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggle(todo);
  };

  // Show attribution only when a real actor is recorded.
  const attribution =
    todo.byName && todo.at
      ? `${todo.done ? '✓' : 'reopened'} ${todo.byName} · ${relativeTime(todo.at, now)}`
      : null;

  return (
    <Pressable
      onPress={toggle}
      onLongPress={canEdit ? () => onEdit(todo) : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Checkbox checked={todo.done} color={color} />
      <View style={styles.textCol}>
        <Text style={[styles.name, todo.done && styles.nameChecked]} numberOfLines={2}>
          {todo.title}
        </Text>
        {attribution && (
          <Text style={[styles.attribution, todo.done ? styles.attrChecked : styles.attrUnchecked]} numberOfLines={1}>
            {attribution}
          </Text>
        )}
      </View>
      {canEdit && (
        <Pressable hitSlop={10} onPress={() => onEdit(todo)} style={styles.more}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#B0B7C0" />
        </Pressable>
      )}
    </Pressable>
  );
}

export default React.memo(TodoRow);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 14,
  },
  pressed: { backgroundColor: 'rgba(0,0,0,0.03)' },
  textCol: { flex: 1 },
  name: { fontSize: 16, color: '#1F2933', fontWeight: '500' },
  nameChecked: { color: '#9AA5B1', textDecorationLine: 'line-through' },
  attribution: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  attrChecked: { color: '#27AE60' },
  attrUnchecked: { color: '#9AA5B1' },
  more: { padding: 4 },
});
