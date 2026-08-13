import React, { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryConfig, CheckRecord, Item } from '../types';
import { CategoryView } from '../hooks/useInventory';
import { endDateLabel, endLabel } from '../cycles';
import ProgressRing from './ProgressRing';
import ItemRow from './ItemRow';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  config: CategoryConfig;
  view: CategoryView;
  now: Date;
  isChecked: (item: Item) => boolean;
  checkInfo: (item: Item) => CheckRecord | undefined;
  canEdit: boolean;
  onToggle: (item: Item) => void;
  onEdit: (item: Item) => void;
}

export default function CategorySection({
  config,
  view,
  now,
  isChecked,
  checkInfo,
  canEdit,
  onToggle,
  onEdit,
}: Props) {
  const [open, setOpen] = useState(false);
  const total = view.items.length;
  const progress = total ? view.checkedCount / total : 0;

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={toggleOpen} style={styles.header}>
        <ProgressRing progress={progress} color={config.color} label={`${view.checkedCount}/${total}`} />
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Ionicons name={config.icon as any} size={16} color={config.color} />
            <Text style={styles.title}>{config.label}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: config.tint }]}>
            <Ionicons name="refresh" size={11} color={config.color} />
            <Text style={[styles.pillText, { color: config.color }]}>
              {endLabel(view.cycle.end, now)} · {endDateLabel(view.cycle.end)}
            </Text>
          </View>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#B0B7C0" />
      </Pressable>

      {open && (
        <View style={styles.list}>
          {total === 0 ? (
            <Text style={styles.empty}>No items in this cycle yet.</Text>
          ) : (
            view.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                checked={isChecked(item)}
                color={config.color}
                info={checkInfo(item)}
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EDF0F3' },
  empty: { padding: 16, color: '#9AA5B1', fontStyle: 'italic' },
});
