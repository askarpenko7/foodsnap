import type { Classification } from 'react-native-food-classifier';
import {
  DIM_BELOW,
  rankLabels,
  defaultSelectionIndex,
  formatConfidence,
  isDimmed,
  isGeneric,
  titleCase,
} from '../labels';

/** What ML Kit actually returned for a margherita pizza on the emulator. */
const REAL_PIZZA_OUTPUT: Classification[] = [
  { label: 'Food', confidence: 0.96 },
  { label: 'Pizza', confidence: 0.95 },
  { label: 'Cuisine', confidence: 0.9 },
  { label: 'Cake', confidence: 0.78 },
  { label: 'Fast food', confidence: 0.78 },
];

/**
 * What Vision actually returned for a salad photo. Kept as its own fixture
 * because the two engines fail differently: Vision ranks the *objects* in the
 * photo above the food, so the object words carry more weight here.
 */
const REAL_VISION_SALAD_OUTPUT: Classification[] = [
  { label: 'tableware', confidence: 0.494 },
  { label: 'utensil', confidence: 0.494 },
  { label: 'bowl', confidence: 0.494 },
  { label: 'food', confidence: 0.462 },
  { label: 'salad', confidence: 0.462 },
];

describe('isGeneric', () => {
  it('flags category words that are useless to look up', () => {
    for (const label of ['Food', 'cuisine', 'Fast food', 'Tableware', 'dish']) {
      expect(isGeneric(label)).toBe(true);
    }
  });

  it('leaves actual foods alone', () => {
    for (const label of ['Pizza', 'Cake', 'Hot dog', 'Granny smith']) {
      expect(isGeneric(label)).toBe(false);
    }
  });

  it('ignores case and padding, since label casing is inconsistent', () => {
    expect(isGeneric('  FOOD  ')).toBe(true);
  });
});

describe('defaultSelectionIndex', () => {
  // The bug this exists to prevent: defaulting to "Food" would have made the
  // nutrition lookup query "food", which matches nothing useful.
  it('skips the generic top hit and selects the first real food', () => {
    expect(defaultSelectionIndex(REAL_PIZZA_OUTPUT)).toBe(1);
    expect(REAL_PIZZA_OUTPUT[defaultSelectionIndex(REAL_PIZZA_OUTPUT)]?.label).toBe('Pizza');
  });

  // Vision ranks tableware/utensil/bowl above the food itself, so without the
  // object words in the stop list the app looked up the nutrition of a utensil.
  it('skips the objects Vision ranks above the food', () => {
    const index = defaultSelectionIndex(REAL_VISION_SALAD_OUTPUT);
    expect(REAL_VISION_SALAD_OUTPUT[index]?.label).toBe('salad');
  });

  it('keeps the top hit when it is already specific', () => {
    expect(
      defaultSelectionIndex([
        { label: 'Pizza', confidence: 0.95 },
        { label: 'Food', confidence: 0.9 },
      ]),
    ).toBe(0);
  });

  it('falls back to the top hit when everything is generic', () => {
    expect(
      defaultSelectionIndex([
        { label: 'Food', confidence: 0.9 },
        { label: 'Cuisine', confidence: 0.8 },
      ]),
    ).toBe(0);
  });

  it('returns 0 for an empty list rather than -1', () => {
    expect(defaultSelectionIndex([])).toBe(0);
  });
});

describe('isDimmed', () => {
  it('dims category words even at high confidence', () => {
    expect(isDimmed({ label: 'Food', confidence: 0.96 })).toBe(true);
  });

  it('dims low-confidence guesses', () => {
    expect(isDimmed({ label: 'Pizza', confidence: DIM_BELOW - 0.01 })).toBe(true);
  });

  it('leaves a confident, specific guess bright — even a wrong one', () => {
    // "Cake" for a pizza is wrong, but the user is better placed to correct it
    // than a heuristic is, so it must not be hidden.
    expect(isDimmed({ label: 'Cake', confidence: 0.78 })).toBe(false);
  });
});

describe('formatConfidence', () => {
  it('renders a rounded percentage', () => {
    expect(formatConfidence(0.951)).toBe('95%');
    expect(formatConfidence(1)).toBe('100%');
    expect(formatConfidence(0)).toBe('0%');
  });
});

describe('titleCase', () => {
  it('capitalises each word', () => {
    expect(titleCase('hot dog')).toBe('Hot Dog');
  });

  it('leaves an already-capitalised label unchanged', () => {
    expect(titleCase('Pizza')).toBe('Pizza');
  });
});

/**
 * Real Vision output from an iPhone 13 Pro Max. Every one of these had the food
 * outranked by the furniture, and two had no food label in the top five at all
 * — which is what forced ranking by tier instead of by confidence.
 */
describe('ranking real device output', () => {
  it('promotes the salad over the crockery that outscored it', () => {
    const ranked = rankLabels([
      { label: 'tableware', confidence: 0.494 },
      { label: 'utensil', confidence: 0.494 },
      { label: 'bowl', confidence: 0.494 },
      { label: 'food', confidence: 0.462 },
      { label: 'salad', confidence: 0.462 },
      { label: 'lettuce', confidence: 0.047 },
      { label: 'tomato', confidence: 0.041 },
    ]);
    expect(ranked[0]?.label).toBe('salad');
    // A 4% food still beats a 49% object.
    expect(ranked[1]?.label).toBe('lettuce');
    expect(ranked.at(-1)?.label).toBe('bowl');
  });

  it('surfaces a food that the old top-5 cap discarded entirely', () => {
    // Pierogi: not one food label in Vision's top five.
    const ranked = rankLabels([
      { label: 'structure', confidence: 0.93 },
      { label: 'wood processed', confidence: 0.9 },
      { label: 'utensil', confidence: 0.88 },
      { label: 'tableware', confidence: 0.88 },
      { label: 'plate', confidence: 0.88 },
      { label: 'dumpling', confidence: 0.06 },
    ]);
    expect(ranked[0]?.label).toBe('dumpling');
    expect(defaultSelectionIndex(ranked)).toBe(0);
  });

  it('prefers a category over an object when no real food is offered', () => {
    // The pie shot: tableware/utensil/plate/food/dessert, nothing nameable.
    const ranked = rankLabels([
      { label: 'tableware', confidence: 0.92 },
      { label: 'utensil', confidence: 0.92 },
      { label: 'plate', confidence: 0.9 },
      { label: 'food', confidence: 0.84 },
      { label: 'dessert', confidence: 0.84 },
    ]);
    expect(['food', 'dessert']).toContain(ranked[0]?.label);
    expect(ranked[0]?.label).not.toBe('tableware');
  });

  it('leaves a confident specific guess on top when there is one', () => {
    const ranked = rankLabels([
      { label: 'food', confidence: 0.96 },
      { label: 'pizza', confidence: 0.95 },
    ]);
    expect(ranked[0]?.label).toBe('pizza');
  });

  it('does not mutate its input', () => {
    const input = [
      { label: 'tableware', confidence: 0.9 },
      { label: 'pizza', confidence: 0.1 },
    ];
    rankLabels(input);
    expect(input[0]?.label).toBe('tableware');
  });
});
