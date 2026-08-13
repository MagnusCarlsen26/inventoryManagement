import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../types';
import { relativeTime } from '../time';

interface Props {
  visible: boolean;
  users: User[];
  onApprove: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function UserManagementSheet({ visible, users, onApprove, onDelete, onClose }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const { pending, approved } = useMemo(() => {
    const staff = users.filter((u) => u.role === 'staff');
    return {
      pending: staff.filter((u) => !u.approved),
      approved: staff.filter((u) => u.approved),
    };
  }, [users]);

  const run = async (id: string, fn: (id: string) => Promise<void>) => {
    setBusyId(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await fn(id);
    } finally {
      setBusyId(null);
    }
  };

  const Avatar = ({ name }: { name: string }) => (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{(name.trim()[0] || '?').toUpperCase()}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.flex} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>Staff</Text>
            <Pressable hitSlop={10} onPress={onClose}>
              <Ionicons name="close" size={24} color="#9AA5B1" />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {pending.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>PENDING APPROVAL</Text>
                {pending.map((u) => (
                  <View key={u.id} style={[styles.row, styles.pendingRow]}>
                    <Avatar name={u.name} />
                    <View style={styles.flex}>
                      <Text style={styles.name}>{u.name}</Text>
                      <Text style={styles.meta}>requested {relativeTime(u.createdAt)} ago</Text>
                    </View>
                    <Pressable
                      style={styles.approveBtn}
                      onPress={() => run(u.id, onApprove)}
                      disabled={busyId === u.id}
                    >
                      {busyId === u.id ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.approveText}>Approve</Text>
                      )}
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => run(u.id, onDelete)} style={styles.iconBtn}>
                      <Ionicons name="close-circle" size={22} color="#CBD2D9" />
                    </Pressable>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.sectionLabel}>APPROVED</Text>
            {approved.length === 0 ? (
              <Text style={styles.empty}>No approved staff yet.</Text>
            ) : (
              approved.map((u) => (
                <View key={u.id} style={styles.row}>
                  <Avatar name={u.name} />
                  <View style={styles.flex}>
                    <Text style={styles.name}>{u.name}</Text>
                    <Text style={styles.meta}>joined {relativeTime(u.createdAt)} ago</Text>
                  </View>
                  <View style={styles.okBadge}>
                    <Ionicons name="checkmark" size={13} color="#27AE60" />
                  </View>
                  <Pressable hitSlop={8} onPress={() => run(u.id, onDelete)} style={styles.iconBtn}>
                    {busyId === u.id ? (
                      <ActivityIndicator size="small" color="#9AA5B1" />
                    ) : (
                      <Ionicons name="trash-outline" size={20} color="#EF5D60" />
                    )}
                  </Pressable>
                </View>
              ))
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,41,51,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#F4F6F8',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 12,
    maxHeight: '80%',
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD2D9',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#1F2933' },
  scroll: { marginTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: '#9AA5B1', marginTop: 16, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  pendingRow: { borderWidth: 1, borderColor: '#FDE2C7' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E4E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#3E4C59' },
  name: { fontSize: 16, fontWeight: '600', color: '#1F2933' },
  meta: { fontSize: 12, color: '#9AA5B1', marginTop: 2 },
  approveBtn: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 78,
    alignItems: 'center',
  },
  approveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  okBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E6F6EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: { padding: 4 },
  empty: { color: '#9AA5B1', fontStyle: 'italic', paddingVertical: 8 },
});
