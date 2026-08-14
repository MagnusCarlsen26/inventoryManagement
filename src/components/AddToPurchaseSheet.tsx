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
import { CategoryConfig, Item } from '../types';

interface Props {
  visible: boolean;
  item: Item | null;
  config?: CategoryConfig;
  onClose: () => void;
  onAdd: (itemId: string, note?: string) => void;
}

export default function AddToPurchaseSheet({ visible, item, config, onClose, onAdd }: Props) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) setNote('');
  }, [visible, item]);

  const add = () => {
    if (!item) return;
    onAdd(item.id, note);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.heading}>Add to purchase list</Text>

          <View style={styles.itemCard}>
            <View style={styles.cartBadge}>
              <Ionicons name="cart" size={16} color="#fff" />
            </View>
            <View style={styles.itemText}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item?.name ?? ''}
              </Text>
              {config && (
                <View style={[styles.chip, { backgroundColor: config.tint }]}>
                  <Ionicons name={config.icon as any} size={12} color={config.color} />
                  <Text style={[styles.chipText, { color: config.color }]}>{config.label}</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g. 500g pack, the usual brand"
            placeholderTextColor="#9AA5B1"
            style={[styles.input, styles.noteInput]}
            multiline
            textAlignVertical="top"
            autoFocus
          />

          <Pressable onPress={add} style={styles.saveBtn}>
            <Text style={styles.saveText}>Add to list</Text>
          </Pressable>
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
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F7F9FA',
    borderWidth: 1,
    borderColor: '#EDF0F3',
  },
  cartBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#1F2933',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1, gap: 6 },
  itemName: { fontSize: 16, fontWeight: '700', color: '#1F2933' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: '#7B8794', marginBottom: 8, marginTop: 18 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E1E5EA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2933',
  },
  noteInput: { minHeight: 76 },
  saveBtn: { backgroundColor: '#1F2933', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
