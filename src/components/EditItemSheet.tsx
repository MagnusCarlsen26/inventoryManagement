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
import { CategoryConfig, CategoryId, Item } from '../types';

interface Props {
  visible: boolean;
  item: Item | null; // null = add mode
  categories: CategoryConfig[];
  onClose: () => void;
  onSave: (name: string, category: CategoryId) => void;
  onAddCategory: (label: string, days: number) => CategoryConfig;
  onDelete?: (id: string) => void;
}

export default function EditItemSheet({
  visible,
  item,
  categories,
  onClose,
  onSave,
  onAddCategory,
  onDelete,
}: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryId>('daily');
  // Inline "new frequency" form.
  const [creating, setCreating] = useState(false);
  const [freqLabel, setFreqLabel] = useState('');
  const [freqDays, setFreqDays] = useState('');

  useEffect(() => {
    if (visible) {
      setName(item?.name ?? '');
      setCategory(item?.category ?? categories[0]?.id ?? 'daily');
      setCreating(false);
      setFreqLabel('');
      setFreqDays('');
    }
  }, [visible, item]);

  const save = () => {
    if (!name.trim()) return;
    onSave(name.trim(), category);
    onClose();
  };

  const days = parseInt(freqDays, 10);
  const canCreateFreq = freqLabel.trim().length > 0 && Number.isFinite(days) && days > 0;

  const createFreq = () => {
    if (!canCreateFreq) return;
    const cat = onAddCategory(freqLabel, days);
    setCategory(cat.id); // auto-select the freshly created frequency
    setCreating(false);
    setFreqLabel('');
    setFreqDays('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.heading}>{item ? 'Edit item' : 'Add item'}</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Item name"
            placeholderTextColor="#9AA5B1"
            style={styles.input}
            autoFocus={!item}
          />

          <Text style={styles.label}>Restock cycle</Text>
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
                  <Ionicons name={c.icon as any} size={14} color={active ? c.color : '#9AA5B1'} />
                  <Text style={[styles.chipText, { color: active ? c.color : '#616E7C' }]}>{c.label}</Text>
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setCreating((v) => !v)}
              style={[styles.chip, styles.newChip]}
            >
              <Ionicons name={creating ? 'close' : 'add'} size={14} color="#3E4C59" />
              <Text style={[styles.chipText, { color: '#3E4C59' }]}>{creating ? 'Cancel' : 'New'}</Text>
            </Pressable>
          </View>

          {creating && (
            <View style={styles.newForm}>
              <TextInput
                value={freqLabel}
                onChangeText={setFreqLabel}
                placeholder="Name (e.g. Every 10 Days)"
                placeholderTextColor="#9AA5B1"
                style={[styles.input, styles.newInput]}
              />
              <View style={styles.daysRow}>
                <TextInput
                  value={freqDays}
                  onChangeText={(t) => setFreqDays(t.replace(/[^0-9]/g, ''))}
                  placeholder="7"
                  placeholderTextColor="#9AA5B1"
                  keyboardType="number-pad"
                  style={[styles.input, styles.daysInput]}
                />
                <Text style={styles.daysHint}>days between restocks</Text>
              </View>
              <Pressable
                onPress={createFreq}
                disabled={!canCreateFreq}
                style={[styles.freqBtn, !canCreateFreq && styles.freqBtnDisabled]}
              >
                <Text style={styles.freqBtnText}>Create frequency</Text>
              </Pressable>
            </View>
          )}

          <Pressable onPress={save} style={styles.saveBtn}>
            <Text style={styles.saveText}>{item ? 'Save changes' : 'Add item'}</Text>
          </Pressable>

          {item && onDelete && (
            <Pressable
              onPress={() => {
                onDelete(item.id);
                onClose();
              }}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={16} color="#EF5D60" />
              <Text style={styles.deleteText}>Delete item</Text>
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
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
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
  daysRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  daysInput: { backgroundColor: '#fff', width: 80, textAlign: 'center' },
  daysHint: { fontSize: 13, color: '#7B8794', fontWeight: '500' },
  freqBtn: { backgroundColor: '#3E4C59', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  freqBtnDisabled: { opacity: 0.4 },
  freqBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  saveBtn: { backgroundColor: '#1F2933', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 4 },
  deleteText: { color: '#EF5D60', fontSize: 15, fontWeight: '600' },
});
