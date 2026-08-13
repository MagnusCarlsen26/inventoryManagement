import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type Mode = 'choose' | 'admin' | 'staff';

interface Props {
  onAdmin: (password: string) => boolean;
  onStaff: (name: string) => Promise<void>;
}

export default function Onboarding({ onAdmin, onStaff }: Props) {
  const [mode, setMode] = useState<Mode>('choose');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submitAdmin = () => {
    if (!onAdmin(password)) setError('Incorrect password');
  };
  const submitStaff = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onStaff(name);
    } catch {
      setError('Could not reach the server. Check your connection.');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <View style={styles.badge}>
            <Ionicons name="cube" size={30} color="#fff" />
          </View>
          <Text style={styles.kicker}>INVENTORY</Text>
          <Text style={styles.title}>Restock Tracker</Text>

          {mode === 'choose' && (
            <View style={styles.block}>
              <Text style={styles.subtitle}>Who's using this device?</Text>
              <Pressable style={styles.primaryBtn} onPress={() => setMode('admin')}>
                <Ionicons name="shield-checkmark" size={18} color="#fff" />
                <Text style={styles.primaryText}>I'm an admin</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={() => setMode('staff')}>
                <Ionicons name="person" size={18} color="#1F2933" />
                <Text style={styles.secondaryText}>I'm staff</Text>
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
              <Pressable style={styles.link} onPress={() => setMode('choose')}>
                <Text style={styles.linkText}>Back</Text>
              </Pressable>
            </View>
          )}

          {mode === 'staff' && (
            <View style={styles.block}>
              <Text style={styles.subtitle}>What's your name?</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setError('');
                }}
                placeholder="e.g. Priya"
                placeholderTextColor="#9AA5B1"
                autoFocus
                autoCapitalize="words"
                onSubmitEditing={submitStaff}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Text style={styles.hint}>An admin will approve you before you can make changes.</Text>
              <Pressable style={[styles.primaryBtn, busy && styles.btnDisabled]} onPress={submitStaff} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Request access</Text>
                )}
              </Pressable>
              {!busy && (
                <Pressable style={styles.link} onPress={() => setMode('choose')}>
                  <Text style={styles.linkText}>Back</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6F8' },
  flex: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#1F2933',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: '#9AA5B1' },
  title: { fontSize: 32, fontWeight: '800', color: '#1F2933', marginTop: 2 },
  block: { marginTop: 36, gap: 12 },
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
  hint: { fontSize: 13, color: '#9AA5B1', lineHeight: 18 },
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
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E7EB',
  },
  secondaryText: { color: '#1F2933', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  link: { alignItems: 'center', paddingVertical: 6 },
  linkText: { color: '#616E7C', fontSize: 14, fontWeight: '600' },
});
