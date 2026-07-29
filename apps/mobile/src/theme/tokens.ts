/**
 * FoodSnap design tokens — code form of docs/DESIGN.md.
 * Dark-only. Accent hex values come from tokens.generated.ts (OKLCH sources,
 * converted by scripts/generate-tokens.mjs — do not hand-tune them).
 */
import { generatedAccentHex } from './tokens.generated';

export const colors = {
  // Surfaces (docs/DESIGN.md §1, hex final)
  bg: {
    deep: '#0B0C0F',
    screen: '#0E1014',
  },
  surface: {
    sheet: '#14161C',
    card: '#171A21',
    cardNested: '#1C1F27',
    input: '#1E212A',
  },
  thumb: {
    stripeA: '#2A2D35',
    stripeB: '#33363F',
  },

  // Text on dark — alpha ladder over #F2F3F5
  text: {
    primary: '#F2F3F5',
    secondary: 'rgba(242,243,245,.55)',
    tertiary: 'rgba(242,243,245,.45)',
    faint: 'rgba(242,243,245,.35)',
  },

  // Accents — generated from OKLCH (see tokens.generated.ts)
  accent: {
    primary: generatedAccentHex['accent.primary'],
    primaryText: generatedAccentHex['accent.primaryText'],
  },
  macro: {
    protein: generatedAccentHex['macro.protein'],
    carbs: generatedAccentHex['macro.carbs'],
    fat: generatedAccentHex['macro.fat'],
  },
  status: {
    ok: generatedAccentHex['status.ok'],
    danger: generatedAccentHex['status.danger'],
  },

  // White alphas (structural)
  line: {
    hairline: 'rgba(255,255,255,.07)',
  },
  bar: {
    track: 'rgba(255,255,255,.08)',
  },
  fill: {
    subtle: 'rgba(255,255,255,.05)',
    chip: 'rgba(255,255,255,.09)',
  },
  glass: {
    fill: 'rgba(255,255,255,.12)',
    border: 'rgba(255,255,255,.24)',
  },
  handle: 'rgba(255,255,255,.22)',

  // Primary CTA
  cta: {
    bg: '#F2F3F5',
    text: '#0B0C0F',
  },
} as const;

export const radii = {
  bar: 4,
  input: 16,
  chip: 16,
  thumb: 16,
  row: 20,
  card: 24,
  cta: 28,
  sheet: 30,
  circle: 999,
} as const;

export const spacing = {
  gutter: 16,
  cardPadding: 20,
  listGap: 8,
  sectionGap: 20,
} as const;

/**
 * Typography. UI text uses the system font; numbers/values/micro-labels use
 * IBM Plex Mono (bundled, OFL — assets/fonts, OFL.txt kept alongside).
 * Android resolves the family by font file name.
 */
export const fontFamily = {
  mono: {
    regular: 'IBMPlexMono-Regular',
    medium: 'IBMPlexMono-Medium',
    semiBold: 'IBMPlexMono-SemiBold',
  },
} as const;

export const type = {
  display: { fontSize: 38, fontWeight: '700', letterSpacing: -1.4 },
  title: { fontSize: 27, fontWeight: '700', letterSpacing: -0.85 },
  heading: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  body: { fontSize: 16, fontWeight: '400' },
  bodyEmphasis: { fontSize: 16, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '400' },
  microLabel: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 11,
    letterSpacing: 1.76, // +.16em at 11px
    textTransform: 'uppercase',
  },
  monoValue: { fontFamily: fontFamily.mono.medium, fontSize: 14 },
  monoMeta: { fontFamily: fontFamily.mono.regular, fontSize: 12 },
} as const;

/**
 * Glass presets (docs/DESIGN.md §4). Decision (Verified Versions table):
 * graceful degrade — RN has no backdrop-filter, so glass surfaces use solid
 * fills at higher alpha with the same borders/shadows. The native BlurView
 * option is deferred (revisit for the P4.1 tab bar).
 */
export const glass = {
  chip: {
    backgroundColor: 'rgba(40,44,56,.92)',
    borderColor: colors.glass.border,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 6,
  },
  tabBar: {
    backgroundColor: 'rgba(30,34,44,.92)',
    borderColor: 'rgba(255,255,255,.16)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.5,
    shadowRadius: 44,
    elevation: 12,
  },
} as const;

export const theme = { colors, radii, spacing, fontFamily, type, glass } as const;
export type Theme = typeof theme;
