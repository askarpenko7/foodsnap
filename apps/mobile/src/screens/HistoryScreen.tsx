/**
 * HistoryScreen — the diary-style list from docs/DESIGN.md §6.
 *
 * Rows only: thumbnail, name, mono meta line, kcal on the right. The daily
 * targets and summary card from concept screen 1 belong to the Diary (P4.2),
 * which absorbs this screen; inventing targets here would mean inventing data.
 */
import React, { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { clearHistory, loadHistory, type HistoryEntry } from '../lib/history';
import { formatConfidence, titleCase } from '../lib/labels';
import { colors, glass, radii, spacing, type } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'History'>;

function timeOf(id: number): string {
  return new Date(id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dayOf(id: number): string {
  const date = new Date(id);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  return isToday ? 'TODAY' : date.toLocaleDateString([], { day: '2-digit', month: 'short' }).toUpperCase();
}

function Row({ entry, onPress }: { entry: HistoryEntry; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityRole="button">
      <Image source={{ uri: entry.imageUri }} style={styles.thumb} resizeMode="cover" />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{titleCase(entry.label)}</Text>
        <Text style={styles.rowMeta}>
          {dayOf(entry.id)} {timeOf(entry.id)} · {formatConfidence(entry.confidence)}
        </Text>
      </View>
      {entry.kcalPer100g !== undefined && (
        <Text style={styles.rowValue}>{Math.round(entry.kcalPer100g)}</Text>
      )}
    </TouchableOpacity>
  );
}

export function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const [entries, setEntries] = useState<HistoryEntry[]>(loadHistory);

  // Reload on focus: a scan made after this screen mounted must show up when
  // the user comes back to it.
  useFocusEffect(
    useCallback(() => {
      setEntries(loadHistory());
    }, []),
  );

  const onClear = useCallback(() => {
    clearHistory();
    setEntries([]);
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, glass.chip]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back to capture"
        >
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>History</Text>
        {entries.length > 0 ? (
          <TouchableOpacity onPress={onClear} accessibilityRole="button">
            <Text style={styles.clear}>Clear</Text>
          </TouchableOpacity>
        ) : (
          // Keeps the title optically centred against the back button.
          <View style={styles.backButton} />
        )}
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing scanned yet</Text>
          <Text style={styles.emptyBody}>
            Your last {20} snaps show up here, stored on this phone only.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.countMicro}>
            {entries.length} {entries.length === 1 ? 'ENTRY' : 'ENTRIES'}
          </Text>
          <FlatList
            data={entries}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Row
                entry={item}
                onPress={() => navigation.navigate('Results', { imageUri: item.imageUri })}
              />
            )}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.screen, paddingTop: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
  },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.9, color: colors.text.primary },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: { fontSize: 20, lineHeight: 22, color: colors.text.primary },
  clear: { ...type.bodyEmphasis, fontSize: 14, color: colors.status.danger },
  countMicro: {
    ...type.microLabel,
    color: colors.text.faint,
    paddingHorizontal: spacing.gutter + 2,
    marginTop: 10,
  },
  list: { padding: spacing.gutter, gap: spacing.listGap },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface.card,
    borderRadius: radii.row,
    padding: 11,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 15,
    backgroundColor: colors.thumb.stripeA,
  },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { ...type.bodyEmphasis, color: colors.text.primary },
  rowMeta: { ...type.monoMeta, color: colors.text.tertiary },
  rowValue: { ...type.monoValue, color: colors.text.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 32 },
  emptyTitle: { ...type.heading, color: colors.text.primary },
  emptyBody: { ...type.caption, color: colors.text.secondary, textAlign: 'center' },
});
