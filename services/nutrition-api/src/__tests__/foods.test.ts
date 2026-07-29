import { describe, expect, it } from '@jest/globals';
import { foods, parseFoods } from '../foods.js';

/** The brief asks for ~120 foods; guard against the file being gutted. */
const MINIMUM_FOODS = 120;

const valid = [
  { name: 'Pizza', aliases: ['margherita'], per100g: { kcal: 266, protein: 11, carbs: 33, fat: 10 } },
];

describe('the bundled database', () => {
  it(`holds at least ${MINIMUM_FOODS} foods`, () => {
    expect(foods.length).toBeGreaterThanOrEqual(MINIMUM_FOODS);
  });

  it('has no duplicate names or aliases, which would make matches order-dependent', () => {
    const keys = foods.flatMap((f) => [f.name, ...f.aliases]).map((k) => k.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every food plausible macros', () => {
    for (const food of foods) {
      const { kcal, protein, carbs, fat } = food.per100g;
      expect(kcal).toBeGreaterThanOrEqual(0);
      expect(kcal).toBeLessThanOrEqual(900);
      expect(protein + carbs + fat).toBeLessThanOrEqual(101);
    }
  });

  it('covers the labels the generic classifier actually emits', () => {
    const names = new Set(foods.map((f) => f.name.toLowerCase()));
    for (const expected of ['pizza', 'salad', 'hamburger', 'hot dog', 'french fries', 'cake']) {
      expect(names).toContain(expected);
    }
  });
});

describe('parseFoods', () => {
  it('accepts a well-formed entry', () => {
    expect(parseFoods(valid)).toHaveLength(1);
  });

  it('rejects a non-array', () => {
    expect(() => parseFoods({})).toThrow(/must contain an array/);
  });

  it('rejects a missing name', () => {
    expect(() => parseFoods([{ aliases: [], per100g: valid[0]!.per100g }])).toThrow(/name/);
  });

  it('rejects aliases that are not strings', () => {
    expect(() => parseFoods([{ ...valid[0], aliases: [7] }])).toThrow(/aliases/);
  });

  // The failure this validation exists for: a typo becoming NaN kcal downstream.
  it('rejects a non-numeric macro', () => {
    expect(() =>
      parseFoods([{ ...valid[0], per100g: { kcal: '266', protein: 11, carbs: 33, fat: 10 } }]),
    ).toThrow(/per100g.kcal/);
  });

  it('rejects a negative macro', () => {
    expect(() =>
      parseFoods([{ ...valid[0], per100g: { kcal: 266, protein: -1, carbs: 33, fat: 10 } }]),
    ).toThrow(/per100g.protein/);
  });

  it('rejects a decimal-point slip in kcal', () => {
    expect(() =>
      parseFoods([{ ...valid[0], per100g: { kcal: 2660, protein: 11, carbs: 33, fat: 10 } }]),
    ).toThrow(/out of range/);
  });

  it('rejects macros summing past 100 g per 100 g', () => {
    expect(() =>
      parseFoods([{ ...valid[0], per100g: { kcal: 500, protein: 50, carbs: 50, fat: 50 } }]),
    ).toThrow(/macros sum to/);
  });

  it('rejects a duplicate key across entries', () => {
    expect(() => parseFoods([valid[0], { ...valid[0], name: 'Other' }])).toThrow(/duplicate key/);
  });

  it('names the offending entry so the message is actionable', () => {
    expect(() => parseFoods([valid[0], { name: 'Broken', aliases: [], per100g: {} }])).toThrow(
      /foods\[1\] \(Broken\)/,
    );
  });
});
