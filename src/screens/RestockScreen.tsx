import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInventory } from '../hooks/useInventory';
import { Identity, Item, CategoryId } from '../types';
import CategorySection from '../components/CategorySection';
import EditItemSheet from '../components/EditItemSheet';
import PurchaseListSection from '../components/PurchaseListSection';
import AddToPurchaseSheet from '../components/AddToPurchaseSheet';
import { Attention, categoryAttention } from '../attention';
import { SYNC_META } from './syncMeta';

const DEV = __DEV__;

interface Props {
  inv: ReturnType<typeof useInventory>;
  identity: Identity;
  pendingCount: number;
  onMenu: () => void;
  onOpenUsers: () => void;
  onOpenProfile: () => void;
  onRefresh: () => Promise<void>;
}

export default function RestockScreen({
  inv,
  identity,
  pendingCount,
  onMenu,
  onOpenUsers,
  onOpenProfile,
  onRefresh,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [purchaseSheetOpen, setPurchaseSheetOpen] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<Item | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = identity.role === 'admin';
  const pendingApproval = identity.role === 'staff' && !identity.approved;

  // One attention level per category, shared by the cards and the header summary so the
  // two can never disagree.
  const attentionById = useMemo(() => {
    const map: Record<string, Attention> = {};
    for (const v of inv.categoryViews) {
      map[v.id] = categoryAttention(v.items.length, v.checkedCount, v.cycle.end, inv.now);
    }
    return map;
  }, [inv.categoryViews, inv.now]);

  const openEdit = (item: Item) => {
    setEditing(item);
    setSheetOpen(true);
  };
  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openAddToPurchase = (item: Item) => {
    setPurchaseTarget(item);
    setPurchaseSheetOpen(true);
  };
  const onSave = (name: string, category: CategoryId) => {
    if (editing) inv.updateItem(editing.id, { name, category });
    else inv.addItem(name, category);
  };
  const refresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  if (!inv.ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1F2933" />
      </View>
    );
  }

  const sync = SYNC_META[inv.syncStatus] ?? SYNC_META.idle;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1F2933" />}
      >
        <View style={styles.header}>
          <View style={styles.topRow}>
            <Pressable style={styles.iconBtn} onPress={onMenu}>
              <Ionicons name="menu" size={20} color="#1F2933" />
            </Pressable>
            <View style={styles.flex} />
            {isAdmin && (
              <Pressable style={styles.iconBtn} onPress={onOpenUsers}>
                <Ionicons name="people-outline" size={19} color="#1F2933" />
                {pendingCount > 0 && (
                  <View style={styles.dotBadge}>
                    <Text style={styles.dotBadgeText}>{pendingCount}</Text>
                  </View>
                )}
              </Pressable>
            )}
            <Pressable style={styles.iconBtn} onPress={onOpenProfile}>
              <Ionicons name="person-circle-outline" size={20} color="#1F2933" />
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.rolePill, isAdmin ? styles.adminPill : styles.staffPill]}>
              <Ionicons
                name={isAdmin ? 'shield-checkmark' : 'person'}
                size={11}
                color={isAdmin ? '#8E6FE0' : '#2D9CDB'}
              />
              <Text style={[styles.rolePillText, { color: isAdmin ? '#8E6FE0' : '#2D9CDB' }]}>
                {isAdmin ? 'Admin' : identity.name}
              </Text>
            </View>
            <View style={styles.syncPill}>
              <View style={[styles.syncDot, { backgroundColor: sync.color }]} />
              <Text style={styles.syncText}>{sync.label}</Text>
            </View>
          </View>

          {!!inv.syncError && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={14} color="#B4232A" />
              <Text style={styles.errorText} numberOfLines={3}>
                Not saved to the server: {inv.syncError}
              </Text>
            </View>
          )}
        </View>

        {pendingApproval && (
          <View style={styles.banner}>
            <Ionicons name="hourglass-outline" size={18} color="#F0932B" />
            <Text style={styles.bannerText}>
              Waiting for an admin to approve your access. You can view the list but can't make changes yet.
            </Text>
          </View>
        )}

        {DEV && (
          <View style={styles.devRow}>
            <Text style={styles.devLabel}>dev · +{inv.devOffsetDays}d</Text>
            <Pressable style={styles.devBtn} onPress={() => inv.setDevOffsetDays((d) => d + 1)}>
              <Text style={styles.devBtnText}>+1 day</Text>
            </Pressable>
            <Pressable style={styles.devBtn} onPress={() => inv.setDevOffsetDays((d) => d + 7)}>
              <Text style={styles.devBtnText}>+7 days</Text>
            </Pressable>
            <Pressable style={styles.devBtn} onPress={() => inv.setDevOffsetDays(0)}>
              <Text style={styles.devBtnText}>reset</Text>
            </Pressable>
          </View>
        )}

        <PurchaseListSection
          views={inv.purchaseViews}
          totals={inv.purchaseTotals}
          now={inv.now}
          isChecked={inv.isChecked}
          checkInfo={inv.checkInfo}
          canDelete={inv.canEdit}
          onToggle={inv.toggle}
          onDelete={inv.deletePurchase}
        />

        {inv.categoryViews.map((view) => (
          <CategorySection
            key={view.id}
            config={inv.categoryMap[view.id]}
            view={view}
            now={inv.now}
            attention={attentionById[view.id] ?? 'active'}
            isChecked={inv.isChecked}
            checkInfo={inv.checkInfo}
            canEdit={inv.canEdit}
            canToggle={inv.canToggle}
            isOnPurchaseList={inv.isOnPurchaseList}
            onToggle={inv.toggle}
            onEdit={openEdit}
            onAddToPurchase={openAddToPurchase}
          />
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {inv.canEdit && (
        <Pressable style={styles.fab} onPress={openAdd}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      )}

      <EditItemSheet
        visible={sheetOpen}
        item={editing}
        categories={inv.categories}
        onClose={() => setSheetOpen(false)}
        onSave={onSave}
        onAddCategory={inv.addCategory}
        onDelete={inv.deleteItem}
      />

      <AddToPurchaseSheet
        visible={purchaseSheetOpen}
        item={purchaseTarget}
        config={purchaseTarget ? inv.categoryMap[purchaseTarget.category] : undefined}
        onClose={() => setPurchaseSheetOpen(false)}
        onAdd={inv.addPurchase}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6F8' },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F8' },
  scroll: { paddingTop: 8 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E4E7EB',
  },
  dotBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#EF5D60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  adminPill: { backgroundColor: '#EFEAFB' },
  staffPill: { backgroundColor: '#E4F2FB' },
  rolePillText: { fontSize: 12, fontWeight: '700' },
  syncPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 4 },
  syncDot: { width: 7, height: 7, borderRadius: 3.5 },
  syncText: { fontSize: 11, fontWeight: '600', color: '#9AA5B1' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 8,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FDECEE',
    borderWidth: 1,
    borderColor: '#F5C2C7',
  },
  errorText: { flex: 1, fontSize: 11, fontWeight: '600', color: '#B4232A', lineHeight: 16 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FDF0E3',
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
  },
  bannerText: { flex: 1, fontSize: 13, color: '#8A5A1E', fontWeight: '500', lineHeight: 18 },
  devRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  devLabel: { fontSize: 12, color: '#9AA5B1', fontWeight: '600' },
  devBtn: { backgroundColor: '#E4E7EB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  devBtnText: { fontSize: 12, fontWeight: '600', color: '#3E4C59' },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1F2933',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F2933',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
