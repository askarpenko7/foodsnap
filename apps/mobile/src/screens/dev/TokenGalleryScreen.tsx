/**
 * Dev-only token gallery — renders surfaces, text ladder, accents, macro bars
 * and the type scale straight from src/theme. Exists so the theme system can be
 * eyeballed against docs/DESIGN.md without hunting through real screens.
 * Not wired into production navigation.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, glass, radii, spacing, type } from '../../theme';

function Swatch({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.swatchRow}>
      <View style={[styles.swatch, { backgroundColor: value }]} />
      <Text style={styles.swatchLabel}>{label}</Text>
      <Text style={styles.swatchValue}>{value}</Text>
    </View>
  );
}

function MacroBar({
  label,
  value,
  fill,
  ratio,
}: {
  label: string;
  value: string;
  fill: string;
  ratio: number;
}) {
  return (
    <View style={styles.macroBar}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>{value}</Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { backgroundColor: fill, flex: ratio }]} />
        <View style={{ flex: 1 - ratio }} />
      </View>
    </View>
  );
}

export function TokenGalleryScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.microLabel}>DESIGN TOKENS · DARK ONLY</Text>
      <Text style={styles.title}>Theme gallery</Text>

      <Text style={styles.sectionLabel}>SURFACES</Text>
      <View style={styles.card}>
        <Swatch label="bg.deep" value={colors.bg.deep} />
        <Swatch label="bg.screen" value={colors.bg.screen} />
        <Swatch label="surface.sheet" value={colors.surface.sheet} />
        <Swatch label="surface.card" value={colors.surface.card} />
        <Swatch label="surface.cardNested" value={colors.surface.cardNested} />
        <Swatch label="surface.input" value={colors.surface.input} />
      </View>

      <Text style={styles.sectionLabel}>ACCENTS · OKLCH → HEX (GENERATED)</Text>
      <View style={styles.card}>
        <Swatch label="accent.primary" value={colors.accent.primary} />
        <Swatch label="accent.primaryText" value={colors.accent.primaryText} />
        <Swatch label="macro.protein" value={colors.macro.protein} />
        <Swatch label="macro.carbs" value={colors.macro.carbs} />
        <Swatch label="macro.fat" value={colors.macro.fat} />
        <Swatch label="status.ok" value={colors.status.ok} />
        <Swatch label="status.danger" value={colors.status.danger} />
      </View>

      <Text style={styles.sectionLabel}>TEXT LADDER</Text>
      <View style={styles.card}>
        <Text style={styles.textPrimary}>text.primary — FoodSnap</Text>
        <Text style={styles.textSecondary}>text.secondary — FoodSnap</Text>
        <Text style={styles.textTertiary}>text.tertiary — FoodSnap</Text>
        <Text style={styles.textFaint}>text.faint — FoodSnap</Text>
      </View>

      <Text style={styles.sectionLabel}>TYPE SCALE · IBM PLEX MONO DATA VOICE</Text>
      <View style={styles.card}>
        <Text style={styles.display}>681</Text>
        <Text style={styles.monoValue}>mono.value — 64 / 120 g</Text>
        <Text style={styles.monoMeta}>mono.meta — 2 slices · 256 g · 12:40</Text>
        <Text style={styles.microLabelCard}>micro.label — PROBABLY · 82%</Text>
      </View>

      <Text style={styles.sectionLabel}>MACRO BARS</Text>
      <View style={styles.card}>
        <MacroBar label="Protein" value="38 g" fill={colors.macro.protein} ratio={0.63} />
        <MacroBar label="Carbs" value="74 g" fill={colors.macro.carbs} ratio={0.82} />
        <MacroBar label="Fat" value="21 g" fill={colors.macro.fat} ratio={0.35} />
        <MacroBar label="Calories" value="681 kcal" fill={colors.accent.primary} ratio={0.57} />
      </View>

      <Text style={styles.sectionLabel}>GLASS (DEGRADE PATH)</Text>
      <View style={styles.glassRow}>
        <View style={[styles.glassChip, glass.chip]}>
          <Text style={styles.glassChipText}>Library</Text>
        </View>
        <View style={[styles.glassChip, glass.tabBar]}>
          <Text style={styles.glassChipText}>Tab bar</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.screen },
  content: { padding: spacing.gutter, paddingBottom: 48, gap: spacing.listGap },
  title: { ...type.title, color: colors.text.primary, marginBottom: spacing.sectionGap },
  sectionLabel: {
    ...type.microLabel,
    color: colors.text.tertiary,
    marginTop: spacing.sectionGap,
    marginBottom: 4,
  },
  microLabel: { ...type.microLabel, color: colors.accent.primaryText },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: 10,
  },
  swatchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line.hairline,
  },
  swatchLabel: { ...type.body, color: colors.text.secondary, flex: 1 },
  swatchValue: { ...type.monoMeta, color: colors.text.tertiary },
  textPrimary: { ...type.body, color: colors.text.primary },
  textSecondary: { ...type.body, color: colors.text.secondary },
  textTertiary: { ...type.body, color: colors.text.tertiary },
  textFaint: { ...type.body, color: colors.text.faint },
  display: { ...type.display, color: colors.text.primary, fontFamily: 'IBMPlexMono-SemiBold' },
  monoValue: { ...type.monoValue, color: colors.text.primary },
  monoMeta: { ...type.monoMeta, color: colors.text.secondary },
  microLabelCard: { ...type.microLabel, color: colors.accent.primaryText },
  macroBar: { gap: 6 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  macroLabel: { ...type.caption, color: colors.text.secondary },
  macroValue: { ...type.monoValue, color: colors.text.primary },
  macroTrack: {
    height: 5,
    borderRadius: radii.bar,
    backgroundColor: colors.bar.track,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  macroFill: { borderRadius: radii.bar },
  glassRow: { flexDirection: 'row', gap: 12 },
  glassChip: {
    borderRadius: radii.chip,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  glassChipText: { ...type.bodyEmphasis, color: colors.text.primary },
});
