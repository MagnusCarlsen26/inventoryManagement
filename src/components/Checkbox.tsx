import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  checked: boolean;
  color: string;
  size?: number;
}

export default function Checkbox({ checked, color, size = 26 }: Props) {
  const anim = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: checked ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 140,
    }).start();
  }, [checked, anim]);

  return (
    <View style={[styles.box, { width: size, height: size, borderColor: checked ? color : '#CBD2D9' }]}>
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color, borderRadius: size / 4, transform: [{ scale: anim }], opacity: anim },
        ]}
      >
        <Ionicons name="checkmark" size={size * 0.68} color="#fff" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
