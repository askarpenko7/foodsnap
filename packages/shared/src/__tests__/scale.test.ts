import { scaleMacros, type Macros } from '../index';

/**
 * Portion arithmetic lives in the contract because a diary entry stores the
 * *computed* macros — get this wrong and the error is written into someone's
 * history rather than corrected on the next read.
 */

const PIZZA: Macros = { kcal: 266, protein: 11, carbs: 33, fat: 10 };

describe('scaleMacros', () => {
  it('is the identity at 100 g', () => {
    expect(scaleMacros(PIZZA, 100)).toEqual(PIZZA);
  });

  it('halves at 50 g', () => {
    expect(scaleMacros(PIZZA, 50)).toEqual({ kcal: 133, protein: 5.5, carbs: 16.5, fat: 5 });
  });

  // The concept's own example: two slices of pizza.
  it('scales a real portion', () => {
    const portion = scaleMacros(PIZZA, 256);
    expect(portion.kcal).toBeCloseTo(680.96, 2);
    expect(portion.protein).toBeCloseTo(28.16, 2);
    expect(portion.carbs).toBeCloseTo(84.48, 2);
    expect(portion.fat).toBeCloseTo(25.6, 2);
  });

  it('scales up past 100 g', () => {
    expect(scaleMacros(PIZZA, 200)).toEqual({ kcal: 532, protein: 22, carbs: 66, fat: 20 });
  });

  it('returns zeros for a zero portion rather than NaN', () => {
    expect(scaleMacros(PIZZA, 0)).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('does not mutate the input', () => {
    const input = { ...PIZZA };
    scaleMacros(input, 250);
    expect(input).toEqual(PIZZA);
  });

  it('keeps full precision — rounding is the UI’s job, not the contract’s', () => {
    // 1 g of pizza is 2.66 kcal; rounding here would lose a third of it.
    expect(scaleMacros(PIZZA, 1).kcal).toBeCloseTo(2.66, 5);
  });
});
