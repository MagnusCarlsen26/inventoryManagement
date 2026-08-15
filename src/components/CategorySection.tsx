import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryConfig, CheckRecord, Item } from '../types';
import { CategoryView } from '../hooks/useInventory';
import { endDateLabel } from '../cycles';
import { Attention, attentionTone } from '../attention';
import ProgressRing from './ProgressRing';
import ItemRow from './ItemRow';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  config: CategoryConfig;
  view: CategoryView;
  now: Date;
  /** How loudly this card should present itself — colour only, never structure. */
  attention: Attention;
  isChecked: (item: Item) => boolean;
  checkInfo: (item: Item) => CheckRecord | undefined;
  canEdit: boolean;
  canToggle: boolean;
  isOnPurchaseList: (itemId: string) => boolean;
  onToggle: (item: Item) => void;
  onEdit: (item: Item) => void;
  onAddToPurchase: (item: Item) => void;
}

export default function CategorySection({
  config,
  view,
  now,
  attention,
  isChecked,
  checkInfo,
  canEdit,
  canToggle,
  isOnPurchaseList,
  onToggle,
  onEdit,
  onAddToPurchase,
}: Props) {
  const [open, setOpen] = useState(false);
  const total = view.items.length;
  const progress = total ? view.checkedCount / total : 0;
  const tone = attentionTone(attention, config);

  // Ease the fade when a card settles (last item ticked) instead of snapping.
  const fade = useRef(new Animated.Value(tone.headerOpacity)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: tone.headerOpacity,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [tone.headerOpacity, fade]);

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tone.cardBg,
          shadowOpacity: tone.shadowOpacity,
          elevation: tone.elevation,
          borderColor: tone.border,
        },
      ]}
    >
      {/* Always mounted, transparent unless due — so no card ever shifts between states. */}
      <View style={[styles.rail, { backgroundColor: tone.rail }]} />

      <Pressable onPress={toggleOpen} style={styles.header}>
        <Animated.View style={[styles.headerInner, { opacity: fade }]}>
          <ProgressRing progress={progress} color={tone.ring} label={`${view.checkedCount}/${total}`} />
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: tone.title }]} numberOfLines={1}>
              {config.label}
            </Text>
            <Text style={[styles.reset, { color: tone.pillFg }]}>{endDateLabel(view.cycle.end)}</Text>
          </View>
        </Animated.View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color={tone.chevron} />
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
                canToggle={canToggle}
                onPurchaseList={isOnPurchaseList(item.id)}
                now={now}
                onToggle={onToggle}
                onEdit={onEdit}
                onAddToPurchase={onAddToPurchase}
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
    borderRadius: 16,
    marginHorizontal: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#1F2933',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  rail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingLeft: 15, paddingRight: 12, gap: 10 },
  headerInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '700' },
  reset: { fontSize: 12, fontWeight: '600' },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EDF0F3' },
  empty: { padding: 12, fontSize: 13, color: '#9AA5B1', fontStyle: 'italic' },
});
