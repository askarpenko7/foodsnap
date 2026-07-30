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
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { Classification } from 'react-native-food-classifier';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useClassifier } from '../hooks/useClassifier';
import { useNutrition } from '../hooks/useNutrition';
import { NutritionCard } from '../components/NutritionCard';
import { Notice } from '../components/Notice';
import {
  defaultSelectionIndex,
  formatConfidence,
  isDimmed,
  titleCase,
} from '../lib/labels';
import { colors, glass, radii, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

function RadioRow({
  item,
  selected,
  onSelect,
}: {
  item: Classification;
  selected: boolean;
  onSelect: () => void;
}) {
  const dimmed = isDimmed(item);
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
      accessibilityLabel={`${item.label}, ${formatConfidence(item.confidence)}`}
    >
      <View style={[styles.radioOuter, selected && { borderColor: colors.accent.primary }]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.radioLabel}>{item.label}</Text>
      <Text style={styles.radioConfidence}>{formatConfidence(item.confidence)}</Text>
    </TouchableOpacity>
  );
}

export function ResultsScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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

  // A scan is deliberately not logged on sight: it enters the diary only when
  // the user commits a portion below. Auto-recording every classification would
  // fill daily totals with food that was never eaten.
  //
  // The CTA needs real per-100 g values, so it appears only once the lookup has
  // landed — there is nothing to scale a portion from otherwise.
  const canLog = nutrition.status === 'ready' || nutrition.status === 'cached';
  const openPortion = useCallback(() => {
    if (nutrition.status !== 'ready' && nutrition.status !== 'cached') return;
    navigation.navigate('Portion', {
      name: nutrition.data.name,
      per100g: nutrition.data.per100g,
      imageUri,
      ...(nutrition.data.servings === undefined ? {} : { servings: nutrition.data.servings }),
    });
  }, [nutrition, imageUri, navigation]);

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
                  PROBABLY · {formatConfidence(selected.confidence)}
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

        {state.status === 'ready' && canLog && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <TouchableOpacity
              style={styles.cta}
              onPress={openPortion}
              accessibilityRole="button"
              accessibilityLabel="Choose a portion and add to the diary"
            >
              <Text style={styles.ctaText}>Add to diary</Text>
            </TouchableOpacity>
          </View>
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
  footer: {
    paddingHorizontal: spacing.gutter,
    paddingTop: 14,
    backgroundColor: colors.surface.sheet,
    borderTopWidth: 1,
    borderTopColor: colors.line.hairline,
  },
  cta: {
    height: 56,
    borderRadius: radii.cta,
    backgroundColor: colors.cta.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: colors.cta.text },
  radioLabel: { ...type.bodyEmphasis, color: colors.text.primary, flex: 1 },
  radioConfidence: { ...type.monoValue, color: colors.text.secondary },
});
