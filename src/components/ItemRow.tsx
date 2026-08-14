import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CheckRecord, Item } from '../types';
import { relativeTime } from '../time';
import Checkbox from './Checkbox';

interface Props {
  item: Item;
  checked: boolean;
  color: string;
  info?: CheckRecord;
  canEdit: boolean;
  /** admins + approved staff — both may flag an item for the purchase list. */
  canToggle: boolean;
  onPurchaseList: boolean;
  now: Date;
  onToggle: (item: Item) => void;
  onEdit: (item: Item) => void;
  onAddToPurchase: (item: Item) => void;
}

function ItemRow({
  item,
  checked,
  color,
  info,
  canEdit,
  canToggle,
  onPurchaseList,
  now,
  onToggle,
  onEdit,
  onAddToPurchase,
}: Props) {
  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggle(item);
  };

  const addToPurchase = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onAddToPurchase(item);
  };

  // Show attribution only when a real actor is recorded (migrated/seed records have none).
  const attribution =
    info && info.byName && info.byName !== '—'
      ? `${info.checked ? '✓' : 'unchecked'} ${info.byName} · ${relativeTime(info.at, now)}`
      : null;

  return (
    <Pressable
      onPress={toggle}
      onLongPress={canEdit ? () => onEdit(item) : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Checkbox checked={checked} color={color} />
      <View style={styles.textCol}>
        <Text style={[styles.name, checked && styles.nameChecked]} numberOfLines={1}>
          {item.name}
        </Text>
        {attribution && (
          <Text style={[styles.attribution, info!.checked ? styles.attrChecked : styles.attrUnchecked]} numberOfLines={1}>
            {attribution}
          </Text>
        )}
      </View>
      {canToggle && (
        <Pressable
          hitSlop={10}
          disabled={onPurchaseList}
          onPress={addToPurchase}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          accessibilityLabel={onPurchaseList ? 'Already on the purchase list' : 'Add to purchase list'}
        >
          <Ionicons
            name={onPurchaseList ? 'cart' : 'cart-outline'}
            size={18}
            color={onPurchaseList ? color : '#B0B7C0'}
            style={onPurchaseList ? styles.onList : undefined}
          />
        </Pressable>
      )}
      {canEdit && (
        <Pressable hitSlop={10} onPress={() => onEdit(item)} style={styles.action}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#B0B7C0" />
        </Pressable>
      )}
    </Pressable>
  );
}

export default React.memo(ItemRow);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  pressed: { backgroundColor: 'rgba(0,0,0,0.03)' },
  textCol: { flex: 1, marginLeft: 6 },
  name: { fontSize: 16, color: '#1F2933', fontWeight: '500' },
  nameChecked: { color: '#9AA5B1', textDecorationLine: 'line-through' },
  attribution: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  attrChecked: { color: '#27AE60' },
  attrUnchecked: { color: '#9AA5B1' },
  action: { padding: 4 },
  actionPressed: { opacity: 0.5 },
  onList: { opacity: 0.75 },
});
