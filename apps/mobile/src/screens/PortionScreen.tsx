/**
 * PortionScreen — design concept screen 5 (docs/DESIGN.md §5): − / value / +
 * stepper with a tap-to-type weight, one-tap serving chips, a THIS PORTION card
 * recomputing live from per-100 g, and the "Add N g" CTA that finally puts an
 * entry in the diary.
 *
 * Presented as a sheet over Results, so dismissing it leaves the scan intact.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { scaleMacros, type Serving } from '@foodsnap/shared';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { addEntry, dayKey } from '../lib/diary';
import { titleCase } from '../lib/labels';
import { colors, glass, radii, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Portion'>;

/** Always offered, whatever the food — the fallback everything can be weighed in. */
const BASE_SERVING: Serving = { label: '100 g', grams: 100 };

const STEP_GRAMS = 10;
const MIN_GRAMS = 1;
/** Same ceiling the service enforces on a serving; a diary entry is not a sack. */
const MAX_GRAMS = 2000;

function clampGrams(value: number): number {
  if (!Number.isFinite(value)) return MIN_GRAMS;
  return Math.min(MAX_GRAMS, Math.max(MIN_GRAMS, Math.round(value)));
}

/**
 * Bars show each macro's share of this portion's own macro grams — the same
 * scale NutritionCard uses. Daily targets would be the better denominator, but
 * they belong to the day rather than to one portion, and mixing the two would
 * make two cards with identical numbers draw different bars.
 */
function MacroRow({
  label,
  grams,
  share,
  color,
}: {
  label: string;
  grams: number;
  share: number;
  color: string;
}) {
  return (
    <View>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>{grams.toFixed(1)} g</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[styles.fill, { backgroundColor: color, width: `${Math.round(share * 100)}%` }]}
        />
      </View>
    </View>
  );
}

export function PortionScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { name, per100g, imageUri, servings } = route.params;

  // Chips: the food's own portions if it has any, always with 100 g first.
  const chips = useMemo<Serving[]>(() => {
    const own = servings ?? [];
    return own.some((s) => s.grams === BASE_SERVING.grams) ? own : [BASE_SERVING, ...own];
  }, [servings]);

  // Open on the food's first real serving — "1 slice" beats "100 g" as a guess
  // at what someone just ate — falling back to 100 g when it has none.
  const [grams, setGrams] = useState<number>(() => servings?.[0]?.grams ?? BASE_SERVING.grams);
  const [typed, setTyped] = useState<string | null>(null);

  const portion = useMemo(() => scaleMacros(per100g, grams), [per100g, grams]);

  const macroShare = useCallback(
    (value: number) => {
      const total = portion.protein + portion.carbs + portion.fat;
      return total > 0 ? value / total : 0;
    },
    [portion],
  );

  const commitTyped = useCallback(() => {
    if (typed !== null) {
      setGrams(clampGrams(Number(typed)));
      setTyped(null);
    }
    Keyboard.dismiss();
  }, [typed]);

  const onAdd = useCallback(() => {
    addEntry(dayKey(), {
      name,
      grams,
      kcal: portion.kcal,
      protein: portion.protein,
      carbs: portion.carbs,
      fat: portion.fat,
      ...(imageUri === undefined ? {} : { imageUri }),
    });
    // Straight back to the tabs, past Results and the Capture modal — logging is
    // finished, and the Diary reloads on focus. Navigating to a route already in
    // the stack pops to it rather than pushing a second copy.
    navigation.navigate('Main');
  }, [name, grams, portion, imageUri, navigation]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.micro}>HOW MUCH?</Text>
          <Text style={styles.title}>{titleCase(name)}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepButton, glass.chip]}
              onPress={() => setGrams((g) => clampGrams(g - STEP_GRAMS))}
              accessibilityRole="button"
              accessibilityLabel={`Decrease by ${STEP_GRAMS} grams`}
            >
              <Text style={styles.stepGlyph}>−</Text>
            </TouchableOpacity>

            <View style={styles.weightBlock}>
              <View style={styles.weightRow}>
                <TextInput
                  style={styles.weightInput}
                  value={typed ?? String(grams)}
                  onChangeText={(text) => setTyped(text.replace(/[^0-9]/g, ''))}
                  onBlur={commitTyped}
                  onSubmitEditing={commitTyped}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  selectTextOnFocus
                  accessibilityLabel="Portion weight in grams"
                />
                <Text style={styles.weightUnit}>g</Text>
              </View>
              <Text style={styles.weightHint}>tap to type an exact weight</Text>
            </View>

            <TouchableOpacity
              style={[styles.stepButton, glass.chip]}
              onPress={() => setGrams((g) => clampGrams(g + STEP_GRAMS))}
              accessibilityRole="button"
              accessibilityLabel={`Increase by ${STEP_GRAMS} grams`}
            >
              <Text style={styles.stepGlyph}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chipRow}>
            {chips.map((serving) => {
              const active = serving.grams === grams;
              return (
                <TouchableOpacity
                  key={serving.label}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    setTyped(null);
                    setGrams(clampGrams(serving.grams));
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {serving.label === '100 g'
                      ? serving.label
                      : `${serving.label} · ${serving.grams} g`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.portionHeader}>
            <Text style={styles.micro}>THIS PORTION</Text>
            <Text style={styles.microFaint}>{Math.round(per100g.kcal)} KCAL / 100 G</Text>
          </View>
          <View style={styles.kcalRow}>
            <Text style={styles.kcal}>{Math.round(portion.kcal)}</Text>
            <Text style={styles.kcalUnit}>kcal</Text>
          </View>
          <View style={styles.macroList}>
            <MacroRow
              label="Protein"
              grams={portion.protein}
              share={macroShare(portion.protein)}
              color={colors.macro.protein}
            />
            <MacroRow
              label="Carbs"
              grams={portion.carbs}
              share={macroShare(portion.carbs)}
              color={colors.macro.carbs}
            />
            <MacroRow
              label="Fat"
              grams={portion.fat}
              share={macroShare(portion.fat)}
              color={colors.macro.fat}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cta}
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Add ${grams} grams of ${name} to the diary`}
        >
          <Text style={styles.ctaText}>Add {grams} g</Text>
          <Text style={styles.ctaValue}>{Math.round(portion.kcal)} KCAL</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.sheet },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingTop: 8,
    gap: 12,
  },
  headerText: { flex: 1, gap: 7 },
  micro: { ...type.microLabel, color: colors.text.faint },
  microFaint: { ...type.microLabel, fontSize: 10, color: colors.text.faint },
  title: { ...type.title, color: colors.text.primary },
  cancel: { ...type.bodyEmphasis, color: colors.text.tertiary },
  body: { padding: spacing.gutter, gap: 14, paddingBottom: 24 },
  card: {
    backgroundColor: colors.surface.cardNested,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: 20,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  stepButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontSize: 22, lineHeight: 26, color: colors.text.primary },
  weightBlock: { alignItems: 'center', minWidth: 132 },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent.primary,
    paddingBottom: 6,
  },
  weightInput: {
    ...type.display,
    fontFamily: type.monoValue.fontFamily,
    fontSize: 44,
    color: colors.text.primary,
    padding: 0,
    minWidth: 84,
    textAlign: 'center',
  },
  weightUnit: { ...type.body, fontSize: 17, color: colors.text.secondary },
  weightHint: { ...type.caption, fontSize: 12, color: colors.text.faint, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: radii.chip, backgroundColor: colors.fill.chip },
  chipActive: { backgroundColor: colors.accent.primary },
  chipText: { ...type.bodyEmphasis, fontSize: 13, color: colors.text.secondary },
  chipTextActive: { color: '#fff' },
  portionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: -8 },
  kcal: { ...type.display, fontSize: 34, color: colors.text.primary },
  kcalUnit: { ...type.body, color: colors.text.secondary },
  macroList: { gap: 12, marginTop: -8 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  macroLabel: { ...type.caption, color: colors.text.secondary },
  macroValue: { ...type.monoValue, fontSize: 13, color: colors.text.primary },
  track: { marginTop: 6, height: 5, borderRadius: 3, backgroundColor: colors.bar.track },
  fill: { height: '100%', borderRadius: 3 },
  footer: {
    paddingHorizontal: spacing.gutter,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: colors.surface.sheet,
    borderTopWidth: 1,
    borderTopColor: colors.line.hairline,
  },
  cta: {
    height: 56,
    borderRadius: radii.cta,
    backgroundColor: colors.cta.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: colors.cta.text },
  ctaValue: { ...type.monoValue, fontSize: 13, color: 'rgba(11,12,15,.55)' },
});
