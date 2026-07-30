import type { Classification } from 'react-native-food-classifier';

/**
 * Turning raw classifier output into something worth showing.
 *
 * ML Kit's default labeler is a generic image classifier, so a pizza photo comes
 * back as `Food 96%`, `Pizza 95%`, `Cuisine 90%`, `Cake 78%`. The category words
 * are not wrong, they are just useless to look up — "food" matches nothing
 * sensible in the nutrition database. They are therefore demoted out of the
 * default selection and dimmed in the list, the same treatment the design
 * concept gives its "Tableware · not food" row. The user can still pick one.
 *
 * A food-specific model would make this whole module unnecessary; that swap is
 * the roadmap's first item.
 */

/** Rows below this confidence render dimmed. */
export const DIM_BELOW = 0.3;

/**
 * Vision and ML Kit both describe the *scene*, not the meal. On real photos the
 * top of the list is reliably furniture and crockery: a plate of pierogi came
 * back as `structure 93%, wood processed 90%, utensil 88%, tableware 88%,
 * plate 88%` — not one food label — while the salad shot buried lettuce at 4.7%
 * and tomato at 4.1% beneath `tableware 49%`.
 *
 * So confidence alone cannot choose. Labels are sorted into tiers first and by
 * confidence only within a tier, which is what lets a 4% "lettuce" beat a 49%
 * "tableware". The tiers are evidence-driven — every entry below was observed
 * coming out of one of the two engines on a real photo.
 */

/** Objects, materials and surroundings. Never the answer. */
const OBJECT_LABELS = new Set([
  'tableware',
  'dishware',
  'kitchenware',
  'cookware',
  'utensil',
  'kitchen utensil',
  'cutlery',
  'plate',
  'bowl',
  'cup',
  'mug',
  'glass',
  'drinking glass',
  'fork',
  'knife',
  'spoon',
  'table',
  'dining table',
  'structure',
  'wood processed',
  'wood',
  'material',
  'textile',
  'container',
  'carton',
  'furniture',
  'indoor',
  'outdoor',
  'person',
  'hand',
]);

/** Real words for food, but too broad to look up. Better than an object. */
const CATEGORY_LABELS = new Set([
  'food',
  'cuisine',
  'dish',
  'meal',
  'recipe',
  'ingredient',
  'produce',
  'snack',
  'fast food',
  'junk food',
  'finger food',
  'baked goods',
  'dessert',
  'drink',
  'beverage',
  'vegetable',
  'fruit',
  'meat',
  'grain',
]);

/** 0 = a nameable food, 1 = a food category, 2 = an object. Lower wins. */
export function labelTier(label: string): number {
  const key = label.trim().toLowerCase();
  if (OBJECT_LABELS.has(key)) return 2;
  if (CATEGORY_LABELS.has(key)) return 1;
  return 0;
}

/** Anything that is not a nameable food — kept for the dimming rule. */
export function isGeneric(label: string): boolean {
  return labelTier(label) > 0;
}

/**
 * Best-first ordering: nameable foods, then categories, then objects, with
 * confidence breaking ties inside each tier. The native side now hands over ~20
 * candidates precisely so this has something to promote.
 */
export function rankLabels(results: Classification[]): Classification[] {
  return [...results].sort((a, b) => {
    const tier = labelTier(a.label) - labelTier(b.label);
    return tier !== 0 ? tier : b.confidence - a.confidence;
  });
}

/**
 * Index of the first label specific enough to look up; falls back to the top
 * hit. Call it on an already-ranked list and it is simply 0 unless every
 * candidate was generic.
 */
export function defaultSelectionIndex(results: Classification[]): number {
  const specific = results.findIndex((r) => !isGeneric(r.label));
  return specific === -1 ? 0 : specific;
}

/** A row is dimmed when it is a category word or the model was barely confident. */
export function isDimmed(item: Classification): boolean {
  return item.confidence < DIM_BELOW || isGeneric(item.label);
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function titleCase(label: string): string {
  return label.replace(/\b\w/g, (c) => c.toUpperCase());
}
