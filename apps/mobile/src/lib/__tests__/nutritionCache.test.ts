import type { NutritionResponse } from '@foodsnap/shared';
import { clearNutritionCache, readCache, writeCache } from '../nutritionCache';

const PIZZA: NutritionResponse = {
  name: 'Pizza',
  per100g: { kcal: 266, protein: 11, carbs: 33, fat: 10 },
  match: { query: 'pizza', matchedOn: 'pizza', score: 1 },
};

beforeEach(() => {
  clearNutritionCache();
});

describe('nutrition cache', () => {
  it('misses for a food never looked up', () => {
    expect(readCache('pizza')).toBeNull();
  });

  it('returns what was written, with a timestamp for the notice', () => {
    writeCache('pizza', PIZZA);
    const hit = readCache('pizza');
    expect(hit?.data.per100g.kcal).toBe(266);
    expect(hit?.cachedAt).toBeLessThanOrEqual(Date.now());
  });

  // The classifier's casing is inconsistent, and "Pizza" is the same food as "pizza".
  it('is case- and padding-insensitive', () => {
    writeCache('Pizza', PIZZA);
    expect(readCache('  pizza ')?.data.name).toBe('Pizza');
  });

  it('overwrites rather than accumulating on a repeat lookup', () => {
    writeCache('pizza', PIZZA);
    writeCache('pizza', { ...PIZZA, per100g: { ...PIZZA.per100g, kcal: 300 } });
    expect(readCache('pizza')?.data.per100g.kcal).toBe(300);
  });

  it('keeps foods separate', () => {
    writeCache('pizza', PIZZA);
    writeCache('salad', { ...PIZZA, name: 'Salad' });
    expect(readCache('pizza')?.data.name).toBe('Pizza');
    expect(readCache('salad')?.data.name).toBe('Salad');
  });

  it('clears everything, since cached numbers are user data too', () => {
    writeCache('pizza', PIZZA);
    writeCache('salad', { ...PIZZA, name: 'Salad' });
    clearNutritionCache();
    expect(readCache('pizza')).toBeNull();
    expect(readCache('salad')).toBeNull();
  });

  // Bounds the store rather than protecting correctness — a food's macros do
  // not drift, so this is housekeeping, not staleness.
  it('treats an entry past its age limit as a miss', () => {
    writeCache('pizza', PIZZA);
    const ninetyOneDays = 91 * 24 * 60 * 60 * 1000;
    const spy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + ninetyOneDays);

    expect(readCache('pizza')).toBeNull();
    spy.mockRestore();
  });

  it('keeps an entry that is merely old', () => {
    writeCache('pizza', PIZZA);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const spy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + thirtyDays);

    expect(readCache('pizza')?.data.name).toBe('Pizza');
    spy.mockRestore();
  });
});
