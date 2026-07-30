/**
 * DiaryScreen — design concept screen 1 (docs/DESIGN.md §5): date header, kcal
 * summary card (consumed / target, "left today", mono %), three macro target
 * bars, "Logged today" rows. Absorbs the P3.3 HistoryScreen: entries arrive
 * via "Add to diary" (P4.3) or search/manual logging (P4.4), never from merely
 * scanning a photo.
 */
import React, { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  DEFAULT_TARGETS,
  dayKey,
  dayLabel,
  loadEntries,
  loadTargets,
  shiftDay,
  totals,
  type DiaryEntry,
} from '../lib/diary';
import { titleCase } from '../lib/labels';
import { colors, radii, spacing, type } from '../theme';

/** The floating tab bar overlays content; keep the list clear of it. */
const TAB_BAR_CLEARANCE = 118;

function formatKcal(value: number): string {
  return Math.round(value).toLocaleString();
}

function timeOf(id: number): string {
  return new Date(id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function TargetBar({
  label,
  consumed,
  target,
  color,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
}) {
  const ratio = target > 0 ? Math.min(consumed / target, 1) : 0;
  return (
    <View>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {Math.round(consumed)} / {Math.round(target)} g
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

function EntryRow({ entry }: { entry: DiaryEntry }) {
  return (
    <View style={styles.row}>
      {entry.imageUri ? (
        <Image source={{ uri: entry.imageUri }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{titleCase(entry.name)}</Text>
        <Text style={styles.rowMeta}>
          {Math.round(entry.grams)} g · {timeOf(entry.id)}
        </Text>
      </View>
      <Text style={styles.rowValue}>{formatKcal(entry.kcal)}</Text>
    </View>
  );
}

export function DiaryScreen() {
  const insets = useSafeAreaInsets();
  const [day, setDay] = useState(dayKey);
  // Start empty and load on focus — the MMKV store is deliberately touched
  // only after mount (see the lazy-singleton comment in lib/diary.ts).
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);

  // Reload on focus: an entry added from the portion editor or search must be
  // visible when the user lands back here. Reset to today as well — the diary
  // is a "how is today going" screen first.
  useFocusEffect(
    useCallback(() => {
      const today = dayKey();
      setDay(today);
      setEntries(loadEntries(today));
      setTargets(loadTargets());
    }, []),
  );

  const goToDay = useCallback(
    (delta: number) => {
      const next = shiftDay(day, delta);
      // No future logging: the forward chevron stops at today.
      if (next > dayKey()) return;
      setDay(next);
      setEntries(loadEntries(next));
    },
    [day],
  );

  const consumed = totals(entries);
  const kcalLeft = Math.max(targets.kcal - consumed.kcal, 0);
  const pctOfTarget =
    targets.kcal > 0 ? Math.round((consumed.kcal / targets.kcal) * 100) : 0;
  const atToday = day >= dayKey();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.dateHeader}>
        <TouchableOpacity
          onPress={() => goToDay(-1)}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          style={styles.chevron}
        >
          <Text style={styles.chevronGlyph}>‹</Text>
        </TouchableOpacity>
        <View style={styles.dateTitleWrap}>
          <Text style={styles.dateMicro}>{dayLabel(day)}</Text>
          <Text style={styles.dateTitle}>{dayLabel(day) === 'TODAY' ? 'Today' : 'Diary'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => goToDay(1)}
          disabled={atToday}
          accessibilityRole="button"
          accessibilityLabel="Next day"
          style={styles.chevron}
        >
          <Text style={[styles.chevronGlyph, atToday && styles.chevronDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_CLEARANCE + insets.bottom },
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.micro}>KCAL · {dayLabel(day)}</Text>
                <Text style={styles.pctMicro}>{pctOfTarget}% OF TARGET</Text>
              </View>
              <View style={styles.kcalRow}>
                <Text style={styles.kcalBig}>{formatKcal(consumed.kcal)}</Text>
                <Text style={styles.kcalTarget}>/ {formatKcal(targets.kcal)} kcal</Text>
              </View>
              <Text style={styles.leftText}>
                {formatKcal(kcalLeft)} left {atToday ? 'today' : 'that day'}
              </Text>
              <View style={styles.macroList}>
                <TargetBar
                  label="Protein"
                  consumed={consumed.protein}
                  target={targets.protein}
                  color={colors.macro.protein}
                />
                <TargetBar
                  label="Carbs"
                  consumed={consumed.carbs}
                  target={targets.carbs}
                  color={colors.macro.carbs}
                />
                <TargetBar
                  label="Fat"
                  consumed={consumed.fat}
                  target={targets.fat}
                  color={colors.macro.fat}
                />
              </View>
            </View>

            <Text style={styles.loggedMicro}>
              LOGGED {dayLabel(day)} · {entries.length}{' '}
              {entries.length === 1 ? 'ENTRY' : 'ENTRIES'}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing logged yet</Text>
            <Text style={styles.emptyBody}>
              Snap your plate with the camera button and add the portion to your diary.
            </Text>
          </View>
        }
        renderItem={({ item }) => <EntryRow entry={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.screen },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: 10,
  },
  dateTitleWrap: { alignItems: 'center', gap: 2 },
  dateMicro: { ...type.microLabel, color: colors.accent.primaryText },
  dateTitle: { ...type.title, fontSize: 26, color: colors.text.primary },
  chevron: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  chevronGlyph: { fontSize: 26, color: colors.text.primary },
  chevronDisabled: { color: colors.text.faint },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.listGap },
  summaryCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: 12,
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  micro: { ...type.microLabel, color: colors.text.tertiary },
  pctMicro: { ...type.microLabel, color: colors.accent.primaryText },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  kcalBig: {
    ...type.display,
    fontFamily: 'IBMPlexMono-SemiBold',
    fontSize: 40,
    color: colors.text.primary,
  },
  kcalTarget: { ...type.monoValue, color: colors.text.secondary },
  leftText: { ...type.caption, color: colors.text.secondary },
  macroList: { gap: 13, marginTop: 4 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  macroLabel: { ...type.caption, color: colors.text.secondary },
  macroValue: { ...type.monoValue, fontSize: 13, color: colors.text.primary },
  track: { marginTop: 6, height: 5, borderRadius: 3, backgroundColor: colors.bar.track },
  fill: { height: '100%', borderRadius: 3 },
  loggedMicro: {
    ...type.microLabel,
    color: colors.text.faint,
    marginTop: spacing.sectionGap,
    marginBottom: 2,
  },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 40, paddingHorizontal: 32 },
  emptyTitle: { ...type.heading, color: colors.text.primary },
  emptyBody: { ...type.caption, color: colors.text.secondary, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface.card,
    borderRadius: radii.row,
    padding: 11,
  },
  thumb: { width: 56, height: 56, borderRadius: 15, backgroundColor: colors.thumb.stripeA },
  thumbPlaceholder: { backgroundColor: colors.thumb.stripeB },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { ...type.bodyEmphasis, color: colors.text.primary },
  rowMeta: { ...type.monoMeta, color: colors.text.tertiary },
  rowValue: { ...type.monoValue, color: colors.text.primary },
});
