import type { Food, Macros } from '@foodsnap/shared';
import rawFoods from '../data/foods.json';

/**
 * `foods.json` is hand-authored, so it is validated on load rather than trusted.
 * A typo in the data should stop the service at boot with a precise message,
 * not surface as `NaN` kcal in somebody's diary.
 */

const MACRO_KEYS = ['kcal', 'protein', 'carbs', 'fat'] as const;

/** Nothing edible exceeds this per 100 g; catches a decimal-point slip. */
const MAX_KCAL_PER_100G = 900;

function parseMacros(value: unknown, where: string): Macros {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`${where}: per100g must be an object`);
  }
  const record = value as Record<string, unknown>;
  const macros = {} as Record<(typeof MACRO_KEYS)[number], number>;

  for (const key of MACRO_KEYS) {
    const n = record[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
      throw new Error(`${where}: per100g.${key} must be a non-negative number, got ${String(n)}`);
    }
    macros[key] = n;
  }

  if (macros.kcal > MAX_KCAL_PER_100G) {
    throw new Error(`${where}: ${macros.kcal} kcal per 100 g is out of range`);
  }
  // Macros are grams per 100 g, so they cannot sum past 100. A little slack for
  // rounding and for the water/fibre/ash the four numbers do not account for.
  const macroGrams = macros.protein + macros.carbs + macros.fat;
  if (macroGrams > 101) {
    throw new Error(`${where}: macros sum to ${macroGrams} g per 100 g`);
  }
  return macros;
}

export function parseFoods(input: unknown): Food[] {
  if (!Array.isArray(input)) throw new Error('foods.json must contain an array');

  const seen = new Set<string>();
  return input.map((entry, index) => {
    const where = `foods[${index}]`;
    if (typeof entry !== 'object' || entry === null) throw new Error(`${where} must be an object`);
    const { name, aliases, per100g } = entry as Record<string, unknown>;

    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error(`${where}: name must be a non-empty string`);
    }
    if (!Array.isArray(aliases) || aliases.some((a) => typeof a !== 'string')) {
      throw new Error(`${where} (${name}): aliases must be an array of strings`);
    }

    // Duplicate keys would make matches depend on array order.
    for (const key of [name, ...(aliases as string[])]) {
      const normalized = key.trim().toLowerCase();
      if (seen.has(normalized)) throw new Error(`${where} (${name}): duplicate key "${key}"`);
      seen.add(normalized);
    }

    return { name, aliases: aliases as string[], per100g: parseMacros(per100g, `${where} (${name})`) };
  });
}

/** The validated database. Throws at import time if the data is malformed. */
export const foods: Food[] = parseFoods(rawFoods);
