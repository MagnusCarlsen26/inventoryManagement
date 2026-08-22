import React, { useState } from 'react';
import { Alert, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CheckRecord, Item } from '../types';
import { PurchaseView } from '../hooks/useInventory';
import { relativeTime } from '../time';
import Checkbox from './Checkbox';
import ProgressRing from './ProgressRing';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  views: PurchaseView[];
  totals: { total: number; bought: number };
  now: Date;
  isChecked: (item: Item) => boolean;
  checkInfo: (item: Item) => CheckRecord | undefined;
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
  checkInfo,
  canDelete,
  onToggle,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={styles.card}>
      <Pressable
        onPress={toggleOpen}
        style={styles.header}
        testID="purchase-list-toggle"
        accessibilityRole="button"
        accessibilityLabel={`Purchase list, ${totals.bought} of ${totals.total} bought`}
        accessibilityState={{ expanded: open }}
      >
        <ProgressRing
          progress={totals.total ? totals.bought / totals.total : 0}
          color="#1F2933"
          label={`${totals.bought}/${totals.total}`}
        />
        <Text style={styles.title}>Purchase List</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color="#9AA5B1" />
      </Pressable>

      {open &&
        (views.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={22} color="#CBD2D9" />
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
                info={checkInfo(v.item)}
                now={now}
                canDelete={canDelete}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ))}
          </View>
        ))}
    </View>
  );
}

interface RowProps {
  view: PurchaseView;
  checked: boolean;
  info?: CheckRecord;
  now: Date;
  canDelete: boolean;
  onToggle: (item: Item) => void;
  onDelete: (entryId: string) => void;
}

function PurchaseRow({ view, checked, info, now, canDelete, onToggle, onDelete }: RowProps) {
  const { entry, item, config } = view;

  // Same check history the category rows show — who last toggled it and when.
  const attribution =
    info && info.byName && info.byName !== '—'
      ? `${info.checked ? '✓' : 'unchecked'} ${info.byName} · ${relativeTime(info.at, now)}`
      : null;

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
        <View style={styles.nameLine}>
          <Text style={[styles.name, checked && styles.nameChecked]} numberOfLines={2}>
            {item.name}
          </Text>
          {attribution && (
            <Text
              style={[styles.attribution, info!.checked ? styles.attrChecked : styles.attrUnchecked]}
              numberOfLines={1}
            >
              {attribution}
            </Text>
          )}
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
          <Ionicons name="trash-outline" size={16} color="#EF5D60" />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#1F2933',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1F2933' },

  empty: { alignItems: 'center', gap: 5, paddingHorizontal: 20, paddingBottom: 18, paddingTop: 2 },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: '#9AA5B1' },
  emptyHint: { fontSize: 12, color: '#B0B7C0', textAlign: 'center' },

  list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EDF0F3' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 14, gap: 6 },
  rowPressed: { backgroundColor: 'rgba(0,0,0,0.03)' },
  rowText: { flex: 1, marginLeft: 5, gap: 3 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 14, color: '#1F2933', fontWeight: '500' },
  nameChecked: { color: '#9AA5B1', textDecorationLine: 'line-through' },
  attribution: { fontSize: 11, fontWeight: '600' },
  attrChecked: { color: '#27AE60' },
  attrUnchecked: { color: '#9AA5B1' },
  note: { fontSize: 12, color: '#7B8794', fontStyle: 'italic', lineHeight: 17 },
  trash: { padding: 4 },
  trashPressed: { opacity: 0.5 },
});
