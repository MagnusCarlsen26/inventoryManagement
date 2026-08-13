import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Identity } from '../types';

interface Props {
  visible: boolean;
  identity: Identity;
  /** Same admin login as onboarding: returns false on wrong password. */
  onLoginAdmin: (password: string) => boolean;
  onSignOut: () => void;
  onClose: () => void;
}

export default function ProfileSheet({ visible, identity, onLoginAdmin, onSignOut, onClose }: Props) {
  const [mode, setMode] = useState<'view' | 'admin'>('view');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const isAdmin = identity.role === 'admin';

  const reset = () => {
    setMode('view');
    setPassword('');
    setError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const submitAdmin = () => {
    if (onLoginAdmin(password)) {
      reset();
      onClose();
    } else {
      setError('Incorrect password');
    }
  };

  const signOut = () => {
    reset();
    onSignOut();
  };

  const status = isAdmin
    ? 'Admin'
    : identity.approved
      ? 'Staff · approved'
      : 'Staff · awaiting approval';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={styles.flex} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>Profile</Text>
            <Pressable hitSlop={10} onPress={close}>
              <Ionicons name="close" size={24} color="#9AA5B1" />
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={[styles.avatar, isAdmin ? styles.adminAvatar : styles.staffAvatar]}>
              <Ionicons
                name={isAdmin ? 'shield-checkmark' : 'person'}
                size={26}
                color={isAdmin ? '#8E6FE0' : '#2D9CDB'}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.name}>{isAdmin ? 'Admin' : identity.name}</Text>
              <Text style={styles.status}>{status}</Text>
            </View>
          </View>

          {mode === 'view' && (
            <View style={styles.block}>
              {!isAdmin && (
                <Pressable style={styles.primaryBtn} onPress={() => setMode('admin')}>
                  <Ionicons name="shield-checkmark" size={18} color="#fff" />
                  <Text style={styles.primaryText}>Switch to admin</Text>
                </Pressable>
              )}
              <Pressable style={styles.dangerBtn} onPress={signOut}>
                <Ionicons name="log-out-outline" size={18} color="#EF5D60" />
                <Text style={styles.dangerText}>Sign out</Text>
              </Pressable>
            </View>
          )}

          {mode === 'admin' && (
            <View style={styles.block}>
              <Text style={styles.subtitle}>Enter the admin password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError('');
                }}
                placeholder="Password"
                placeholderTextColor="#9AA5B1"
                secureTextEntry
                autoFocus
                onSubmitEditing={submitAdmin}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Pressable style={styles.primaryBtn} onPress={submitAdmin}>
                <Text style={styles.primaryText}>Continue</Text>
              </Pressable>
              <Pressable style={styles.link} onPress={() => { setMode('view'); setPassword(''); setError(''); }}>
                <Text style={styles.linkText}>Back</Text>
              </Pressable>
            </View>
          )}

          <View style={{ height: 24 }} />
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  adminAvatar: { backgroundColor: '#EFEAFB' },
  staffAvatar: { backgroundColor: '#E4F2FB' },
  name: { fontSize: 18, fontWeight: '700', color: '#1F2933' },
  status: { fontSize: 13, color: '#9AA5B1', marginTop: 2 },
  block: { marginTop: 20, gap: 12 },
  subtitle: { fontSize: 16, fontWeight: '600', color: '#3E4C59', marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2933',
    borderWidth: 1,
    borderColor: '#E4E7EB',
  },
  error: { fontSize: 13, color: '#EF5D60', fontWeight: '600' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1F2933',
    paddingVertical: 15,
    borderRadius: 14,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F5C6C7',
  },
  dangerText: { color: '#EF5D60', fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: 6 },
  linkText: { color: '#616E7C', fontSize: 14, fontWeight: '600' },
});
