import type { Classification } from 'react-native-food-classifier';
import {
  DIM_BELOW,
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
