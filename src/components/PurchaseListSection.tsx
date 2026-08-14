import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Item } from '../types';
import { PurchaseView } from '../hooks/useInventory';
import { endLabel } from '../cycles';
import Checkbox from './Checkbox';

interface Props {
  views: PurchaseView[];
  totals: { total: number; bought: number };
  now: Date;
  isChecked: (item: Item) => boolean;
  /** admin only — staff can add to the list but never remove from it. */
  canDelete: boolean;
  onToggle: (item: Item) => void;
  onDelete: (entryId: string) => void;
}

/**
 * The shopping view, pinned above every category. A row's tick is the linked item's own
 * check for the current cycle, so ticking here ticks it in its category and vice-versa.
 * Rows never reorder when ticked — an entry stays exactly where it was last seen.
 */
export default function PurchaseListSection({
  views,
  totals,
  now,
  isChecked,
  canDelete,
  onToggle,
  onDelete,
}: Props) {
  const remaining = totals.total - totals.bought;
  const allBought = totals.total > 0 && remaining === 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="cart" size={18} color="#fff" />
        </View>
        <Text style={styles.title}>Purchase List</Text>
        {totals.total > 0 && (
          <View style={[styles.countPill, allBought ? styles.countPillDone : styles.countPillOpen]}>
            <Ionicons
              name={allBought ? 'checkmark-circle' : 'ellipse-outline'}
              size={11}
              color={allBought ? '#27AE60' : '#EF5D60'}
            />
            <Text style={[styles.countText, { color: allBought ? '#27AE60' : '#EF5D60' }]}>
              {allBought ? 'All bought' : `${remaining} to buy`}
            </Text>
          </View>
        )}
      </View>

      {views.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={26} color="#CBD2D9" />
          <Text style={styles.emptyTitle}>Nothing to buy yet</Text>
          <Text style={styles.emptyHint}>Tap the cart icon on any item to add it here.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {views.map((v) => (
            <PurchaseRow
              key={v.entry.id}
              view={v}
              checked={isChecked(v.item)}
              now={now}
              canDelete={canDelete}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface RowProps {
  view: PurchaseView;
  checked: boolean;
  now: Date;
  canDelete: boolean;
  onToggle: (item: Item) => void;
  onDelete: (entryId: string) => void;
}

function PurchaseRow({ view, checked, now, canDelete, onToggle, onDelete }: RowProps) {
  const { entry, item, config, cycle } = view;

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggle(item);
  };

  const confirmDelete = () => {
    Alert.alert('Remove from purchase list?', `“${item.name}” will be taken off the list.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onDelete(entry.id) },
    ]);
  };

  return (
    <Pressable onPress={toggle} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Checkbox checked={checked} color={config.color} />
      <View style={styles.rowText}>
        <Text style={[styles.name, checked && styles.nameChecked]} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.dot, { backgroundColor: config.color }]} />
          <Text style={styles.meta} numberOfLines={1}>
            {config.label} · {endLabel(cycle.end, now)}
          </Text>
        </View>
        {!!entry.note && (
          <Text style={styles.note} numberOfLines={3}>
            {entry.note}
          </Text>
        )}
      </View>
      {canDelete && (
        <Pressable
          hitSlop={10}
          onPress={confirmDelete}
          style={({ pressed }) => [styles.trash, pressed && styles.trashPressed]}
          accessibilityLabel={`Remove ${item.name} from the purchase list`}
        >
          <Ionicons name="trash-outline" size={18} color="#EF5D60" />
        </Pressable>
      )}
    </Pressable>
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
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#1F2933',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1F2933' },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  countPillOpen: { backgroundColor: '#FDECEC' },
  countPillDone: { backgroundColor: '#E6F6EC' },
  countText: { fontSize: 12, fontWeight: '700' },

  empty: { alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingBottom: 24, paddingTop: 2 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#9AA5B1' },
  emptyHint: { fontSize: 13, color: '#B0B7C0', textAlign: 'center' },

  list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EDF0F3' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 8 },
  rowPressed: { backgroundColor: 'rgba(0,0,0,0.03)' },
  rowText: { flex: 1, marginLeft: 6, gap: 3 },
  name: { fontSize: 16, color: '#1F2933', fontWeight: '500' },
  nameChecked: { color: '#9AA5B1', textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  meta: { flex: 1, fontSize: 12, fontWeight: '600', color: '#9AA5B1' },
  note: { fontSize: 13, color: '#7B8794', fontStyle: 'italic', lineHeight: 18 },
  trash: { padding: 4 },
  trashPressed: { opacity: 0.5 },
});
