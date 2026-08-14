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
import { Attention, categoryAttention, summarizeAttention } from '../attention';
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

  const attention = useMemo(
    () => summarizeAttention(inv.categoryViews.map((v) => attentionById[v.id])),
    [inv.categoryViews, attentionById],
  );

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

  const { total, checked } = inv.totals;
  const pct = total ? Math.round((checked / total) * 100) : 0;
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
              <Ionicons name="menu" size={24} color="#1F2933" />
            </Pressable>
            <View style={styles.flex}>
              <Text style={styles.kicker}>INVENTORY</Text>
              <Text style={styles.title}>Restock Tracker</Text>
            </View>
            {isAdmin && (
              <Pressable style={styles.iconBtn} onPress={onOpenUsers}>
                <Ionicons name="people-outline" size={22} color="#1F2933" />
                {pendingCount > 0 && (
                  <View style={styles.dotBadge}>
                    <Text style={styles.dotBadgeText}>{pendingCount}</Text>
                  </View>
                )}
              </Pressable>
            )}
            <Pressable style={styles.iconBtn} onPress={onOpenProfile}>
              <Ionicons name="person-circle-outline" size={24} color="#1F2933" />
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.rolePill, isAdmin ? styles.adminPill : styles.staffPill]}>
              <Ionicons
                name={isAdmin ? 'shield-checkmark' : 'person'}
                size={12}
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

          <View style={styles.summaryRow}>
            <View style={styles.summaryBar}>
              <View style={[styles.summaryFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.summaryText}>
              {checked} / {total} done
            </Text>
          </View>

          {total > 0 && (
          <View style={styles.attentionRow}>
            {attention.needAttention === 0 ? (
              <>
                <Ionicons name="checkmark-circle" size={13} color="#27AE60" />
                <Text style={[styles.attentionText, styles.attentionClear]}>All caught up</Text>
              </>
            ) : (
              <>
                <Ionicons name="eye-outline" size={13} color="#616E7C" />
                <Text style={styles.attentionText}>
                  {attention.needAttention} {attention.needAttention === 1 ? 'list needs' : 'lists need'} attention
                  {attention.due > 0 && (
                    <Text style={styles.attentionDue}> · {attention.due} resetting soon</Text>
                  )}
                </Text>
              </>
            )}
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
          <Ionicons name="add" size={28} color="#fff" />
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
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: '#9AA5B1' },
  title: { fontSize: 30, fontWeight: '800', color: '#1F2933', marginTop: 2 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
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
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  adminPill: { backgroundColor: '#EFEAFB' },
  staffPill: { backgroundColor: '#E4F2FB' },
  rolePillText: { fontSize: 13, fontWeight: '700' },
  syncPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5 },
  syncDot: { width: 8, height: 8, borderRadius: 4 },
  syncText: { fontSize: 12, fontWeight: '600', color: '#9AA5B1' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  summaryBar: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#E4E7EB', overflow: 'hidden' },
  summaryFill: { height: '100%', borderRadius: 5, backgroundColor: '#27AE60' },
  summaryText: { fontSize: 13, fontWeight: '700', color: '#616E7C' },
  attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  attentionText: { fontSize: 12, fontWeight: '600', color: '#616E7C' },
  attentionClear: { color: '#27AE60' },
  attentionDue: { color: '#EF5D60', fontWeight: '700' },
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
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
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
