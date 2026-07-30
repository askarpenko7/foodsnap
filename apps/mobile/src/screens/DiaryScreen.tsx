/**
 * DiaryScreen — placeholder for the P4.1 navigation skeleton.
 * The real screen (design concept screen 1: date header, kcal summary card,
 * macro target bars, "Logged today" rows) lands in P4.2, which also absorbs
 * the P3.3 HistoryScreen.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, type } from '../theme';

export function DiaryScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.center}>
        <Text style={styles.micro}>DIARY</Text>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.body}>Daily targets and the logged list land here in P4.2.</Text>
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
