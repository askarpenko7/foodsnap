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
 * Evidence-driven, not guessed: every entry here has been observed coming out of
 * ML Kit or Vision on a real photo, or is an immediate sibling of one.
 *
 * Vision is the harsher of the two — on a salad photo it ranks
 * `tableware / utensil / bowl` *above* `food` and `salad`, so without the
 * object words the app would look up the nutrition of a utensil.
 */
const GENERIC_LABELS = new Set([
  // Category words for food itself
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
  // Objects that show up in any photo of a plate
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
  'fork',
  'knife',
  'spoon',
  'table',
  'dining table',
]);

/** True for category words that describe a kind of food rather than a food. */
export function isGeneric(label: string): boolean {
  return GENERIC_LABELS.has(label.trim().toLowerCase());
}

/** Index of the first label specific enough to look up; falls back to the top hit. */
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
