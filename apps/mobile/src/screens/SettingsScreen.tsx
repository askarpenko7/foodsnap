/**
 * SettingsScreen — placeholder for the P4.1 navigation skeleton.
 * The real screen (design concept screen 7: daily targets, backend card,
 * preferences, on-this-device info) lands in P4.6.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, type } from '../theme';

export function SettingsScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.center}>
        <Text style={styles.micro}>SETTINGS</Text>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.body}>Targets, backend and device info land here in P4.6.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.screen },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: spacing.gutter,
  },
  micro: { ...type.microLabel, color: colors.accent.primaryText },
  title: { ...type.title, color: colors.text.primary },
  body: { ...type.body, color: colors.text.secondary, textAlign: 'center' },
});
