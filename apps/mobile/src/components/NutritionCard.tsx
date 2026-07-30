/**
 * Nutrition card — docs/DESIGN.md §3 "Nutrition card": kcal display number,
 * a micro-label, and the three macro bars.
 *
 * Values are per 100 g. The design's bars are filled against daily targets,
 * which do not exist until the Diary lands (P4.2), so each bar here shows the
 * macro's share of the item's own macro grams. That keeps the three bars
 * honestly comparable to each other without inventing a target.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Macros } from '@foodsnap/shared';
import type { NutritionState } from '../hooks/useNutrition';
import { colors, radii, spacing, type } from '../theme';
import { Notice } from './Notice';

const MACRO_ROWS = [
  { key: 'protein', label: 'Protein', color: colors.macro.protein },
  { key: 'carbs', label: 'Carbs', color: colors.macro.carbs },
  { key: 'fat', label: 'Fat', color: colors.macro.fat },
] as const;

function MacroBar({
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
        <Text style={styles.macroValue}>{grams} g</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${Math.round(share * 100)}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

function Macros({ per100g }: { per100g: Macros }) {
  const total = per100g.protein + per100g.carbs + per100g.fat;
  return (
    <View style={styles.macroList}>
      {MACRO_ROWS.map(({ key, label, color }) => (
        <MacroBar
          key={key}
          label={label}
          grams={per100g[key]}
          share={total > 0 ? per100g[key] / total : 0}
          color={color}
        />
      ))}
    </View>
  );
}

export function NutritionCard({
  state,
  food,
  onRetry,
}: {
  state: NutritionState;
  food: string | undefined;
  onRetry: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.micro}>NUTRITION · PER 100 G</Text>
        {(state.status === 'ready' || state.status === 'cached') && state.data.match.score < 1 && (
          <Text style={styles.microFaint}>MATCHED {state.data.match.matchedOn.toUpperCase()}</Text>
        )}
      </View>

      {(state.status === 'loading' || state.status === 'idle') && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent.primaryText} />
          <Text style={styles.loadingText}>Looking up {food ?? 'nutrition'}…</Text>
        </View>
      )}

      {(state.status === 'ready' || state.status === 'cached') && (
        <>
          <View style={styles.kcalRow}>
            <Text style={styles.kcal}>{Math.round(state.data.per100g.kcal)}</Text>
            <Text style={styles.kcalUnit}>kcal</Text>
          </View>
          <Macros per100g={state.data.per100g} />
        </>
      )}

      {/* Concept screen 6: real numbers, plainly labelled as not fresh. */}
      {state.status === 'cached' && (
        <Notice
          tone={colors.macro.carbs}
          title="Numbers came from cache"
          body={`The gateway didn't answer, so this is the nutrition stored for ${
            food ?? 'this food'
          } on ${new Date(state.cachedAt).toLocaleDateString()}. Labels never needed the network.`}
        />
      )}

      {state.status === 'unknownFood' && (
        <Notice
          tone={colors.macro.carbs}
          title="Not in the food database"
          body={`"${food}" isn't one of the 139 foods bundled with the nutrition service. Pick another label above, or add it by hand once manual entry lands.`}
        />
      )}

      {state.status === 'failed' && (
        <>
          <Notice
            tone={
              state.failure.kind === 'unreachable' ? colors.macro.carbs : colors.status.danger
            }
            title={
              state.failure.kind === 'unreachable' ? 'Backend offline' : 'Nutrition lookup failed'
            }
            body={
              state.failure.kind === 'unreachable'
                ? `${state.failure.message} Labels above were classified on-device and never needed the network.`
                : state.failure.message
            }
          />
          <TouchableOpacity style={styles.retry} onPress={onRetry} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: 14,
    marginTop: spacing.sectionGap,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  micro: { ...type.microLabel, color: colors.text.tertiary },
  microFaint: { ...type.microLabel, color: colors.text.faint, fontSize: 10 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  loadingText: { ...type.caption, color: colors.text.secondary },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  kcal: { ...type.display, color: colors.text.primary },
  kcalUnit: { ...type.body, color: colors.text.secondary },
  macroList: { gap: 13 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  macroLabel: { ...type.caption, color: colors.text.secondary },
  macroValue: { ...type.monoValue, fontSize: 13, color: colors.text.primary },
  track: { marginTop: 6, height: 5, borderRadius: 3, backgroundColor: colors.bar.track },
  fill: { height: '100%', borderRadius: 3 },
  retry: {
    alignSelf: 'flex-start',
    backgroundColor: colors.fill.chip,
    borderRadius: radii.chip,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  retryText: { ...type.bodyEmphasis, fontSize: 14, color: colors.text.primary },
});
