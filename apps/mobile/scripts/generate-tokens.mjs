#!/usr/bin/env node
/**
 * Generates src/theme/tokens.generated.ts from the OKLCH accent sources in
 * docs/DESIGN.md §1. React Native cannot parse oklch() strings, so accents are
 * authored in OKLCH (source of truth) and converted to exact hex here.
 *
 * Run: yarn workspace foodsnap-mobile tokens:generate
 */
import { converter, formatHex } from 'culori';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '../src/theme/tokens.generated.ts');

// Token name -> OKLCH (lightness, chroma, hue). Keep in sync with docs/DESIGN.md §1.
const OKLCH_SOURCES = {
  'accent.primary': [0.62, 0.19, 275],
  'accent.primaryText': [0.72, 0.15, 275],
  'macro.protein': [0.72, 0.16, 150],
  'macro.carbs': [0.8, 0.14, 75],
  'macro.fat': [0.68, 0.17, 25],
  'status.ok': [0.75, 0.14, 150],
  'status.danger': [0.68, 0.18, 25],
};

const toRgb = converter('oklch');
const entries = Object.entries(OKLCH_SOURCES).map(([name, [l, c, h]]) => {
  const hex = formatHex(toRgb({ mode: 'oklch', l, c, h }));
  return [name, hex];
});

const body = entries
  .map(([name, hex]) => `  '${name}': '${hex}',`)
  .join('\n');

const file = `// GENERATED FILE — do not edit by hand.
// Produced by scripts/generate-tokens.mjs (culori OKLCH → sRGB hex).
// Sources: docs/DESIGN.md §1 "Accents (OKLCH → hex via culori)".
export const generatedAccentHex = {
${body}
} as const;

export type GeneratedAccentToken = keyof typeof generatedAccentHex;
`;

writeFileSync(outPath, file);
console.log(`Wrote ${outPath}`);
for (const [name, hex] of entries) console.log(`  ${name} = ${hex}`);
