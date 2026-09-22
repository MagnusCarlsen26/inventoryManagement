import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { APP_VARIANT } from '../config';

export default function DevMark() {
  if (APP_VARIANT !== 'dev') return null;

  return (
    <View style={styles.mark} testID="dev-mark">
      <Image source={require('../../assets/topolina-logo.jpg')} style={styles.logo} />
      <Text style={styles.brand}>Topolina</Text>
      <Text style={styles.dev}>DEV</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  logo: { width: 24, height: 24, borderRadius: 12 },
  brand: {
    color: '#3B2118',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  dev: { color: '#D97706', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});
