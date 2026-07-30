/**
 * SettingsScreen — design concept screen 7 (docs/DESIGN.md §5): daily targets,
 * the backend card with a live health dot, preferences, a destructive clear, and
 * an ON THIS DEVICE block.
 *
 * Everything here is local. There is no account, so "settings" means what this
 * phone does, and the clear action wipes the diary and the nutrition cache
 * because both are the user's own data.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Config from 'react-native-config';
import { isAvailable } from 'react-native-food-classifier';
import {
  DEFAULT_TARGETS,
  clearDiary,
  loadTargets,
  saveTargets,
  type DailyTargets,
} from '../lib/diary';
import { clearNutritionCache } from '../lib/nutritionCache';
import { checkHealth } from '../api/client';
import { colors, radii, spacing, type } from '../theme';

/** The floating tab bar overlays content; keep the last card clear of it. */
const TAB_BAR_CLEARANCE = 118;

type Health = 'checking' | 'ok' | 'unreachable';

function maskKey(key: string | undefined): string {
  if (!key) return 'not set';
  return key.length <= 4 ? '••••' : `${'•'.repeat(12)}${key.slice(-4)}`;
}

function TargetRow({
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
    <View style={styles.targetRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.targetInputRow}>
        <TextInput
          style={styles.targetInput}
          value={value}
          onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          accessibilityLabel={`Daily ${label} target in ${unit}`}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const [targets, setTargets] = useState<DailyTargets>(DEFAULT_TARGETS);
  const [draft, setDraft] = useState<Record<keyof DailyTargets, string>>({
    kcal: '',
    protein: '',
    carbs: '',
    fat: '',
  });
  const [health, setHealth] = useState<Health>('checking');
  const [showKey, setShowKey] = useState(false);
  const [dimNonFood, setDimNonFood] = useState(true);
  const [classifierReady, setClassifierReady] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loaded = loadTargets();
      setTargets(loaded);
      setDraft({
        kcal: String(loaded.kcal),
        protein: String(loaded.protein),
        carbs: String(loaded.carbs),
        fat: String(loaded.fat),
      });
    }, []),
  );

  // Poll the gateway so the dot reflects reality rather than a stale first read.
  useEffect(() => {
    let cancelled = false;
    const ping = () => {
      checkHealth()
        .then(() => !cancelled && setHealth('ok'))
        .catch(() => !cancelled && setHealth('unreachable'));
    };
    ping();
    const timer = setInterval(ping, 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    isAvailable()
      .then(setClassifierReady)
      .catch(() => setClassifierReady(false));
  }, []);

  const saveAll = useCallback(() => {
    const next = { ...targets };
    for (const key of ['kcal', 'protein', 'carbs', 'fat'] as const) {
      const parsed = Number(draft[key]);
      // An empty or zero target would divide the summary card by zero, so keep
      // the previous value rather than accept it.
      next[key] = Number.isFinite(parsed) && parsed > 0 ? parsed : targets[key];
    }
    setTargets(next);
    setDraft({
      kcal: String(next.kcal),
      protein: String(next.protein),
      carbs: String(next.carbs),
      fat: String(next.fat),
    });
    saveTargets(next);
  }, [draft, targets]);

  const onClear = useCallback(() => {
    Alert.alert(
      'Clear diary & cache?',
      'Every logged entry, your targets and the saved nutrition numbers are removed from this phone. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearDiary();
            clearNutritionCache();
            setTargets(DEFAULT_TARGETS);
            setDraft({
              kcal: String(DEFAULT_TARGETS.kcal),
              protein: String(DEFAULT_TARGETS.protein),
              carbs: String(DEFAULT_TARGETS.carbs),
              fat: String(DEFAULT_TARGETS.fat),
            });
          },
        },
      ],
    );
  }, []);

  const healthColor =
    health === 'ok'
      ? colors.status.ok
      : health === 'unreachable'
        ? colors.status.danger
        : colors.text.faint;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.cardMicro}>DAILY TARGETS</Text>
          <TargetRow
            label="Calories"
            unit="kcal"
            value={draft.kcal}
            onChange={(v) => setDraft((d) => ({ ...d, kcal: v }))}
          />
          <TargetRow
            label="Protein"
            unit="g"
            value={draft.protein}
            onChange={(v) => setDraft((d) => ({ ...d, protein: v }))}
          />
          <TargetRow
            label="Carbs"
            unit="g"
            value={draft.carbs}
            onChange={(v) => setDraft((d) => ({ ...d, carbs: v }))}
          />
          <TargetRow
            label="Fat"
            unit="g"
            value={draft.fat}
            onChange={(v) => setDraft((d) => ({ ...d, fat: v }))}
          />
          <TouchableOpacity style={styles.saveButton} onPress={saveAll} accessibilityRole="button">
            <Text style={styles.saveText}>Save targets</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardMicro}>BACKEND</Text>
          <Text style={styles.rowLabel}>Gateway URL</Text>
          <View style={styles.readonly}>
            <Text style={styles.mono}>{Config.GATEWAY_URL ?? 'not set'}</Text>
          </View>

          <Text style={styles.rowLabel}>API key</Text>
          <View style={styles.readonlyRow}>
            <Text style={styles.mono}>
              {showKey ? (Config.API_KEY ?? 'not set') : maskKey(Config.API_KEY)}
            </Text>
            <TouchableOpacity onPress={() => setShowKey((v) => !v)} accessibilityRole="button">
              <Text style={styles.link}>{showKey ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.healthRow}>
            <View style={[styles.dot, { backgroundColor: healthColor }]} />
            <Text style={styles.rowLabel}>
              {health === 'ok'
                ? 'Connected · gateway healthy'
                : health === 'unreachable'
                  ? 'Unreachable · labels still work offline'
                  : 'Checking…'}
            </Text>
          </View>

          {/* Both values are baked in by react-native-config at build time, so
              editing them in-app would be a lie until the next build. */}
          <Text style={styles.hint}>
            Set in apps/mobile/.env and compiled into the build — changing them needs a rebuild.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.rowTitle}>Dim non-food labels</Text>
              <Text style={styles.hint}>Rather than hiding them</Text>
            </View>
            <Switch
              value={dimNonFood}
              onValueChange={setDimNonFood}
              trackColor={{ true: colors.accent.primary, false: colors.bar.track }}
              thumbColor="#fff"
              accessibilityLabel="Dim non-food labels"
            />
          </View>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.switchRow} onPress={onClear} accessibilityRole="button">
            <View style={styles.switchText}>
              <Text style={styles.rowTitle}>Clear diary &amp; cache</Text>
              <Text style={styles.hint}>Everything is stored on this phone</Text>
            </View>
            <Text style={styles.destructive}>Clear</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionMicro}>ON THIS DEVICE</Text>
        <View style={[styles.card, { marginBottom: TAB_BAR_CLEARANCE }]}>
          <View style={styles.infoRow}>
            <Text style={styles.rowLabel}>Classifier</Text>
            <Text style={styles.mono}>
              {Platform.OS === 'ios' ? 'Vision (iOS)' : 'ML Kit (Android)'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.rowLabel}>Model status</Text>
            <Text style={[styles.mono, classifierReady === true && { color: colors.status.ok }]}>
              {classifierReady === null ? 'checking…' : classifierReady ? 'ready' : 'unavailable'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.rowLabel}>Daily target</Text>
            <Text style={styles.mono}>{targets.kcal} kcal</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.screen },
  body: { padding: spacing.gutter, gap: 11, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.9, color: colors.text.primary },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.card,
    padding: 18,
    gap: 12,
  },
  cardMicro: { ...type.microLabel, color: colors.text.faint },
  sectionMicro: { ...type.microLabel, color: colors.text.faint, marginTop: 13, marginLeft: 4 },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: { ...type.body, fontSize: 15, color: colors.text.primary },
  rowTitle: { ...type.bodyEmphasis, fontSize: 16, color: colors.text.primary },
  targetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface.input,
    borderRadius: 14,
    paddingHorizontal: 13,
  },
  targetInput: {
    ...type.monoValue,
    color: colors.text.primary,
    paddingVertical: 10,
    minWidth: 62,
    textAlign: 'right',
  },
  unit: { ...type.caption, color: colors.text.tertiary },
  saveButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.fill.chip,
    borderRadius: radii.chip,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  saveText: { ...type.bodyEmphasis, fontSize: 14, color: colors.text.primary },
  readonly: { backgroundColor: colors.surface.input, borderRadius: 14, padding: 13 },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.input,
    borderRadius: 14,
    padding: 13,
  },
  mono: { ...type.monoValue, fontSize: 13, color: colors.text.primary },
  link: { ...type.bodyEmphasis, fontSize: 13, color: colors.accent.primaryText },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  hint: { ...type.caption, fontSize: 12, color: colors.text.faint },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchText: { flex: 1, gap: 2 },
  separator: { height: 1, backgroundColor: colors.line.hairline },
  destructive: { ...type.bodyEmphasis, fontSize: 14, color: colors.status.danger },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
