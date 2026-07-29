/**
 * ResultsScreen — design concept screens 4 + 6 (docs/DESIGN.md §5/§6).
 * Photo top with Retake; sheet-styled breakdown: `PROBABLY · NN%` micro-label
 * + top-1 name, "Which one is it?" radio list (selecting swaps the shown food),
 * mono confidence percentages, low-relevance rows dimmed. Selecting a label
 * looks its nutrition up through the gateway; every failure there degrades only
 * the card, because the labels themselves never needed the network.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Classification } from 'react-native-food-classifier';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useClassifier } from '../hooks/useClassifier';
import { useNutrition } from '../hooks/useNutrition';
import { NutritionCard } from '../components/NutritionCard';
import { Notice } from '../components/Notice';
import { colors, glass, radii, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

/** Rows below this confidence render dimmed, like the concept's "not food" row. */
const DIM_BELOW = 0.3;

/**
 * ML Kit's generic labeler happily returns category words — a pizza photo comes
 * back as "Food 96%, Pizza 95%, Cuisine 90%". They are not wrong, just useless
 * for a nutrition lookup ("food" matches nothing sensible), so they are demoted
 * out of the default selection and dimmed in the list, the same treatment the
 * design concept gives its "Tableware · not food" row. Users can still pick one.
 *
 * This is the client-side half of the MVP tradeoff documented in the classifier
 * module: a food-specific model would not need the stop list.
 */
const GENERIC_LABELS = new Set([
  'food',
  'cuisine',
  'dish',
  'recipe',
  'ingredient',
  'produce',
  'snack',
  'fast food',
  'junk food',
  'finger food',
  'baked goods',
  'dessert',
  'tableware',
  'plate',
  'bowl',
  'cutlery',
  'kitchen utensil',
]);

function isGeneric(label: string): boolean {
  return GENERIC_LABELS.has(label.trim().toLowerCase());
}

/** Index of the first label specific enough to look up; falls back to the top hit. */
function defaultSelectionIndex(results: Classification[]): number {
  const specific = results.findIndex((r) => !isGeneric(r.label));
  return specific === -1 ? 0 : specific;
}

function pct(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function titleCase(label: string): string {
  return label.replace(/\b\w/g, (c) => c.toUpperCase());
}

function RadioRow({
  item,
  selected,
  onSelect,
}: {
  item: Classification;
  selected: boolean;
  onSelect: () => void;
}) {
  const dimmed = item.confidence < DIM_BELOW || isGeneric(item.label);
  return (
    <TouchableOpacity
      style={[
        styles.radioRow,
        selected && styles.radioRowSelected,
        dimmed && styles.radioRowDimmed,
      ]}
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${item.label}, ${pct(item.confidence)}`}
    >
      <View style={[styles.radioOuter, selected && { borderColor: colors.accent.primary }]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.radioLabel}>{item.label}</Text>
      <Text style={styles.radioConfidence}>{pct(item.confidence)}</Text>
    </TouchableOpacity>
  );
}

export function ResultsScreen({ route }: Props) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { imageUri } = route.params;
  const { state, retry } = useClassifier(imageUri);
  // null = the user hasn't picked yet, so follow the automatic choice.
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);

  // A re-run can return a shorter list, so a stale index must not survive it.
  const retryFromStart = useCallback(() => {
    setChosenIndex(null);
    retry();
  }, [retry]);

  const selectedIndex = useMemo(
    () =>
      chosenIndex ?? (state.status === 'ready' ? defaultSelectionIndex(state.results) : 0),
    [chosenIndex, state],
  );

  const selected: Classification | undefined = useMemo(
    () => (state.status === 'ready' ? state.results[selectedIndex] : undefined),
    [state, selectedIndex],
  );

  // Re-runs whenever the selection changes, so tapping an alternative looks up
  // that food instead.
  const { state: nutrition, retry: retryNutrition } = useNutrition(selected?.label);

  return (
    <View style={styles.screen}>
      <View style={styles.photoWrap}>
        <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
        <TouchableOpacity
          style={[styles.retakeChip, glass.chip, { top: insets.top + 12 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Retake photo"
        >
          <Text style={styles.retakeText}>Retake</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />

        {state.status === 'loading' && (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.accent.primaryText} size="large" />
            <Text style={styles.centerText}>Classifying on-device…</Text>
          </View>
        )}

        {state.status === 'error' && (
          <View style={styles.centerState}>
            <Notice
              tone={colors.status.danger}
              title="Classification failed"
              body={`${state.code}: ${state.message}`}
            />
            <TouchableOpacity style={styles.retryButton} onPress={retryFromStart}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {state.status === 'ready' && (
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            {selected ? (
              <>
                <Text style={styles.probablyMicro}>
                  PROBABLY · {pct(selected.confidence)}
                </Text>
                <Text style={styles.foodName}>{titleCase(selected.label)}</Text>
              </>
            ) : (
              <>
                <Text style={styles.probablyMicro}>NO LABELS</Text>
                <Text style={styles.foodName}>Nothing recognized</Text>
                <Text style={styles.emptyText}>
                  The on-device model couldn’t name anything in this photo. Try a closer,
                  better-lit shot of the plate.
                </Text>
              </>
            )}

            {state.results.length > 1 && (
              <>
                <Text style={styles.sectionMicro}>WHICH ONE IS IT?</Text>
                <View style={styles.radioList}>
                  {state.results.map((item, index) => (
                    <RadioRow
                      key={`${item.label}-${index}`}
                      item={item}
                      selected={index === selectedIndex}
                      onSelect={() => setChosenIndex(index)}
                    />
                  ))}
                </View>
              </>
            )}

            {selected && (
              <NutritionCard
                state={nutrition}
                food={selected.label}
                onRetry={retryNutrition}
              />
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.deep },
  photoWrap: { height: 300 },
  photo: { width: '100%', height: '100%', backgroundColor: colors.thumb.stripeA },
  retakeChip: {
    position: 'absolute',
    right: spacing.gutter,
    borderRadius: radii.chip,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  retakeText: { ...type.bodyEmphasis, color: colors.text.primary },
  sheet: {
    flex: 1,
    marginTop: -30,
    backgroundColor: colors.surface.sheet,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderTopWidth: 1,
    borderColor: colors.line.hairline,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.handle,
    marginBottom: 6,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: spacing.gutter,
  },
  centerText: { ...type.body, color: colors.text.secondary },
  retryButton: {
    backgroundColor: colors.fill.chip,
    borderRadius: radii.chip,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { ...type.bodyEmphasis, color: colors.text.primary },
  sheetScroll: { flex: 1 },
  sheetContent: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: 30,
    gap: spacing.listGap,
  },
  probablyMicro: { ...type.microLabel, color: colors.accent.primaryText, marginTop: 8 },
  foodName: { ...type.title, color: colors.text.primary, marginBottom: 6 },
  emptyText: { ...type.body, color: colors.text.secondary },
  sectionMicro: {
    ...type.microLabel,
    color: colors.text.tertiary,
    marginTop: spacing.sectionGap,
    marginBottom: 2,
  },
  radioList: { gap: spacing.listGap },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface.cardNested,
    borderRadius: radii.row,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  radioRowSelected: { borderColor: colors.accent.primary },
  radioRowDimmed: { opacity: 0.45 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.text.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent.primary,
  },
  radioLabel: { ...type.bodyEmphasis, color: colors.text.primary, flex: 1 },
  radioConfidence: { ...type.monoValue, color: colors.text.secondary },
});
