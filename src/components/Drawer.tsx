import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export type ScreenId = 'restock' | 'todo';

interface DrawerItem {
  id: ScreenId;
  label: string;
  icon: string;
}

const ITEMS: DrawerItem[] = [
  { id: 'restock', label: 'Restock Tracker', icon: 'cube-outline' },
  { id: 'todo', label: 'To-do', icon: 'checkbox-outline' },
];

const SCREEN_W = Dimensions.get('window').width;
const PANEL_W = Math.min(300, SCREEN_W * 0.82);
const EDGE_HIT = 28; // left-edge strip width that starts an open-swipe

interface Props {
  active: ScreenId;
  onSelect: (id: ScreenId) => void;
  /** render the active screen; receives a fn to open the drawer (for the menu button). */
  children: (openDrawer: () => void) => React.ReactNode;
}

export default function Drawer({ active, onSelect, children }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  // Panel lives off-screen at -PANEL_W and slides to 0 when open.
  const x = useRef(new Animated.Value(-PANEL_W)).current;

  const animateTo = useCallback(
    (to: number) => {
      Animated.spring(x, { toValue: to, useNativeDriver: true, friction: 9, tension: 70 }).start();
    },
    [x],
  );

  const openDrawer = useCallback(() => {
    setOpen(true);
    animateTo(0);
  }, [animateTo]);

  const closeDrawer = useCallback(() => {
    animateTo(-PANEL_W);
    setOpen(false);
  }, [animateTo]);

  // Edge-swipe to open: only claim gestures that start near the left edge and move right.
  const edgeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (e, g) =>
          !open && e.nativeEvent.pageX <= EDGE_HIT && g.dx > 6 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_e, g) => {
          const nx = Math.min(0, -PANEL_W + Math.max(0, g.dx));
          x.setValue(nx);
        },
        onPanResponderRelease: (_e, g) => {
          if (g.dx > PANEL_W * 0.35) openDrawer();
          else closeDrawer();
        },
      }),
    [open, x, openDrawer, closeDrawer],
  );

  // Swipe the open panel back to the left to close it.
  const panelResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dx < -6 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_e, g) => {
          const nx = Math.max(-PANEL_W, Math.min(0, g.dx));
          x.setValue(nx);
        },
        onPanResponderRelease: (_e, g) => {
          if (g.dx < -PANEL_W * 0.35) closeDrawer();
          else openDrawer();
        },
      }),
    [x, openDrawer, closeDrawer],
  );

  const overlayOpacity = x.interpolate({
    inputRange: [-PANEL_W, 0],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const select = (id: ScreenId) => {
    onSelect(id);
    closeDrawer();
  };

  return (
    <View style={styles.root}>
      <View style={styles.fill}>{children(openDrawer)}</View>

      {/* Left-edge catcher — transparent, only active while the drawer is closed. */}
      {!open && <View style={styles.edge} {...edgeResponder.panHandlers} pointerEvents="box-only" />}

      {/* Dimming overlay (tap to close). Non-interactive when fully closed. */}
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Pressable style={styles.fill} onPress={closeDrawer} />
      </Animated.View>

      {/* Sliding panel. */}
      <Animated.View
        style={[styles.panel, { width: PANEL_W, paddingTop: insets.top + 20, transform: [{ translateX: x }] }]}
        {...panelResponder.panHandlers}
      >
        <Text style={styles.brand}>Bhai Inventory</Text>
        <Text style={styles.brandSub}>Workspace</Text>

        <View style={styles.nav}>
          {ITEMS.map((it) => {
            const isActive = it.id === active;
            return (
              <Pressable
                key={it.id}
                onPress={() => select(it.id)}
                style={[styles.navItem, isActive && styles.navItemActive]}
              >
                <Ionicons name={it.icon as any} size={20} color={isActive ? '#1F2933' : '#7B8794'} />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{it.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  edge: { position: 'absolute', top: 0, bottom: 0, left: 0, width: EDGE_HIT, zIndex: 5 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,32,0.45)', zIndex: 10 },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    zIndex: 20,
    shadowColor: '#1F2933',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
  },
  brand: { fontSize: 22, fontWeight: '800', color: '#1F2933' },
  brandSub: { fontSize: 13, color: '#9AA5B1', marginTop: 2, marginBottom: 24 },
  nav: { gap: 6 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  navItemActive: { backgroundColor: '#F0F3F6' },
  navLabel: { fontSize: 16, fontWeight: '600', color: '#7B8794' },
  navLabelActive: { color: '#1F2933', fontWeight: '700' },
});
