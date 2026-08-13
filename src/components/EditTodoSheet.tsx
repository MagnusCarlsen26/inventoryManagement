import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Todo, TodoCategory } from '../types';

interface Props {
  visible: boolean;
  todo: Todo | null; // null = add mode
  categories: TodoCategory[];
  /** category preselected when adding (the section the + was tapped from). */
  defaultCategory?: string;
  onClose: () => void;
  onSave: (title: string, category: string) => void;
  onAddCategory: (label: string) => TodoCategory;
  onDelete?: (id: string) => void;
}

export default function EditTodoSheet({
  visible,
  todo,
  categories,
  defaultCategory,
  onClose,
  onSave,
  onAddCategory,
  onDelete,
}: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [catLabel, setCatLabel] = useState('');

  useEffect(() => {
    if (visible) {
      setTitle(todo?.title ?? '');
      setCategory(todo?.category ?? defaultCategory ?? categories[0]?.id ?? '');
      setCreating(false);
      setCatLabel('');
    }
  }, [visible, todo]);

  const save = () => {
    if (!title.trim() || !category) return;
    onSave(title.trim(), category);
    onClose();
  };

  const canCreateCat = catLabel.trim().length > 0;

  const createCat = () => {
    if (!canCreateCat) return;
    const cat = onAddCategory(catLabel);
    setCategory(cat.id); // auto-select the freshly created category
    setCreating(false);
    setCatLabel('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.heading}>{todo ? 'Edit task' : 'Add task'}</Text>

          <Text style={styles.label}>Task</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What needs doing?"
            placeholderTextColor="#9AA5B1"
            style={styles.input}
            autoFocus={!todo}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {categories.map((c) => {
              const active = c.id === category;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategory(c.id)}
                  style={[
                    styles.chip,
                    { borderColor: active ? c.color : '#E1E5EA', backgroundColor: active ? c.tint : '#fff' },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: c.color }]} />
                  <Text style={[styles.chipText, { color: active ? c.color : '#616E7C' }]}>{c.label}</Text>
                </Pressable>
              );
            })}

            <Pressable onPress={() => setCreating((v) => !v)} style={[styles.chip, styles.newChip]}>
              <Ionicons name={creating ? 'close' : 'add'} size={14} color="#3E4C59" />
              <Text style={[styles.chipText, { color: '#3E4C59' }]}>{creating ? 'Cancel' : 'New'}</Text>
            </Pressable>
          </View>

          {creating && (
            <View style={styles.newForm}>
              <TextInput
                value={catLabel}
                onChangeText={setCatLabel}
                placeholder="Category name (e.g. Cleaning)"
                placeholderTextColor="#9AA5B1"
                style={[styles.input, styles.newInput]}
              />
              <Pressable
                onPress={createCat}
                disabled={!canCreateCat}
                style={[styles.freqBtn, !canCreateCat && styles.freqBtnDisabled]}
              >
                <Text style={styles.freqBtnText}>Create category</Text>
              </Pressable>
            </View>
          )}

          <Pressable onPress={save} style={styles.saveBtn}>
            <Text style={styles.saveText}>{todo ? 'Save changes' : 'Add task'}</Text>
          </Pressable>

          {todo && onDelete && (
            <Pressable
              onPress={() => {
                onDelete(todo.id);
                onClose();
              }}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={16} color="#EF5D60" />
              <Text style={styles.deleteText}>Delete task</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,32,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 40,
  },
  grabber: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: '#E1E5EA', marginBottom: 14 },
  heading: { fontSize: 20, fontWeight: '800', color: '#1F2933', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#7B8794', marginBottom: 8, marginTop: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E1E5EA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2933',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  newChip: { borderColor: '#CBD2D9', borderStyle: 'dashed', backgroundColor: '#F7F9FA' },
  chipText: { fontSize: 13, fontWeight: '600' },
  newForm: {
    marginTop: 4,
    marginBottom: 4,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F7F9FA',
    borderWidth: 1,
    borderColor: '#EDF0F3',
    gap: 10,
  },
  newInput: { backgroundColor: '#fff' },
  freqBtn: { backgroundColor: '#3E4C59', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  freqBtnDisabled: { opacity: 0.4 },
  freqBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  saveBtn: { backgroundColor: '#1F2933', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 4 },
  deleteText: { color: '#EF5D60', fontSize: 15, fontWeight: '600' },
});
