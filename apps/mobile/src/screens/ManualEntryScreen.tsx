/**
 * ManualEntryScreen — the destination of concept screen 2's dashed row:
 * "Name, portion and four numbers".
 *
 * Writes straight to the diary with no network involved. That is the point:
 * when the gateway is down, or the food simply is not in the 139, logging by
 * hand still works.
 *
 * The four numbers are entered per portion, not per 100 g. Someone reading a
 * label reads the portion column, and asking them to convert would be a
 * arithmetic tax on the one path that exists because everything else failed.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { addEntry, dayKey } from '../lib/diary';
import { colors, radii, spacing, type } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ManualEntry'>;

/** Accepts "12", "12.5" and "12,5" — comma decimals are normal in most of Europe. */
function parseNumber(input: string): number | null {
  const cleaned = input.replace(',', '.').trim();
  if (cleaned === '') return 0;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function NumberField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.numberField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.numberInputRow}>
        <TextInput
          style={styles.numberInput}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.text.faint}
          accessibilityLabel={`${label} in ${unit}`}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

export function ManualEntryScreen() {
  const navigation = useNavigation<Nav>();
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('100');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const parsed = useMemo(
    () => ({
      grams: parseNumber(grams),
      kcal: parseNumber(kcal),
      protein: parseNumber(protein),
      carbs: parseNumber(carbs),
      fat: parseNumber(fat),
    }),
    [grams, kcal, protein, carbs, fat],
  );

  const invalid = Object.values(parsed).some((v) => v === null);
  // A name and a portion are the minimum; zero calories is a legitimate entry
  // (black coffee), so kcal is not required to be positive.
  const canSave = name.trim() !== '' && !invalid && (parsed.grams ?? 0) > 0;

  const onSave = useCallback(() => {
    if (!canSave) return;
    addEntry(dayKey(), {
      name: name.trim(),
      grams: parsed.grams ?? 0,
      kcal: parsed.kcal ?? 0,
      protein: parsed.protein ?? 0,
      carbs: parsed.carbs ?? 0,
      fat: parsed.fat ?? 0,
    });
    // popTo rather than navigate — see the note in PortionScreen: in React
    // Navigation 7 `navigate` pushes a second copy instead of returning.
    navigation.popTo('Main');
  }, [canSave, name, parsed, navigation]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.micro}>BY HAND</Text>
          <Text style={styles.title}>Add a food</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Grandma’s soup"
              placeholderTextColor={colors.text.faint}
              autoFocus
              accessibilityLabel="Food name"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardMicro}>THIS PORTION</Text>
            <View style={styles.grid}>
              <NumberField label="Portion" unit="g" value={grams} onChange={setGrams} />
              <NumberField label="Calories" unit="kcal" value={kcal} onChange={setKcal} />
              <NumberField label="Protein" unit="g" value={protein} onChange={setProtein} />
              <NumberField label="Carbs" unit="g" value={carbs} onChange={setCarbs} />
              <NumberField label="Fat" unit="g" value={fat} onChange={setFat} />
            </View>
            {invalid && (
              <Text style={styles.invalid}>
                Numbers only, and nothing below zero.
              </Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, !canSave && styles.ctaDisabled]}
            onPress={onSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
          >
            <Text style={[styles.ctaText, !canSave && styles.ctaTextDisabled]}>
              Add to diary
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.sheet },
  flex: { flex: 1 },
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
  title: { ...type.title, color: colors.text.primary },
  cancel: { ...type.bodyEmphasis, color: colors.text.tertiary },
  body: { padding: spacing.gutter, gap: 14, paddingBottom: 24 },
  card: {
    backgroundColor: colors.surface.cardNested,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: 12,
  },
  cardMicro: { ...type.microLabel, color: colors.text.faint },
  fieldLabel: { ...type.caption, color: colors.text.secondary },
  textInput: {
    ...type.body,
    color: colors.text.primary,
    backgroundColor: colors.surface.input,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  grid: { gap: 12 },
  numberField: { gap: 6 },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface.input,
    borderRadius: radii.input,
    paddingHorizontal: 14,
  },
  numberInput: {
    ...type.monoValue,
    fontSize: 16,
    flex: 1,
    color: colors.text.primary,
    paddingVertical: 12,
  },
  unit: { ...type.caption, color: colors.text.tertiary },
  invalid: { ...type.caption, color: colors.status.danger },
  footer: {
    paddingHorizontal: spacing.gutter,
    paddingTop: 14,
    paddingBottom: 6,
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
  ctaDisabled: { backgroundColor: colors.fill.chip },
  ctaText: { fontSize: 17, fontWeight: '700', color: colors.cta.text },
  ctaTextDisabled: { color: colors.text.faint },
});
