import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useInventory } from './src/hooks/useInventory';
import { useTodos } from './src/hooks/useTodos';
import { useAuth } from './src/hooks/useAuth';
import Drawer, { ScreenId } from './src/components/Drawer';
import RestockScreen from './src/screens/RestockScreen';
import TodoScreen from './src/screens/TodoScreen';
import UserManagementSheet from './src/components/UserManagementSheet';
import ProfileSheet from './src/components/ProfileSheet';
import Onboarding from './src/screens/Onboarding';
import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const auth = useAuth();

  // Surface the "your access was removed" notice once.
  useEffect(() => {
    if (auth.accessRemoved) {
      Alert.alert('Access removed', 'An admin has removed your access to this inventory.');
      auth.dismissAccessRemoved();
    }
  }, [auth.accessRemoved]);

  if (!auth.ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1F2933" />
      </View>
    );
  }

  if (!auth.identity) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Onboarding onAdmin={auth.loginAdmin} onStaff={auth.registerStaffAccount} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Main auth={auth} />
    </SafeAreaProvider>
  );
}

function Main({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const identity = auth.identity!;
  const inv = useInventory(identity);
  const todos = useTodos(identity);
  const [screen, setScreen] = useState<ScreenId>('restock');
  const [usersOpen, setUsersOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isAdmin = identity.role === 'admin';
  const pendingCount = inv.users.filter((u) => u.role === 'staff' && !u.approved).length;

  const refreshRestock = async () => {
    await Promise.all([inv.refresh(), auth.refreshStaff()]);
  };
  const refreshTodos = async () => {
    await Promise.all([todos.refresh(), auth.refreshStaff()]);
  };

  return (
    <View style={styles.root}>
      <Drawer active={screen} onSelect={setScreen}>
        {(openDrawer) =>
          screen === 'restock' ? (
            <RestockScreen
              inv={inv}
              identity={identity}
              pendingCount={pendingCount}
              onMenu={openDrawer}
              onOpenUsers={() => setUsersOpen(true)}
              onOpenProfile={() => setProfileOpen(true)}
              onRefresh={refreshRestock}
            />
          ) : (
            <TodoScreen
              todos={todos}
              identity={identity}
              now={inv.now}
              onMenu={openDrawer}
              onOpenProfile={() => setProfileOpen(true)}
              onRefresh={refreshTodos}
            />
          )
        }
      </Drawer>

      {isAdmin && (
        <UserManagementSheet
          visible={usersOpen}
          users={inv.users}
          onApprove={inv.approveUser}
          onDelete={inv.deleteUser}
          onClose={() => setUsersOpen(false)}
        />
      )}

      <ProfileSheet
        visible={profileOpen}
        identity={identity}
        onLoginAdmin={auth.loginAdmin}
        onSignOut={auth.signOut}
        onClose={() => setProfileOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6F8' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F8' },
});
