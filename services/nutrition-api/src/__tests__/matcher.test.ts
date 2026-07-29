import { describe, expect, it } from '@jest/globals';
import type { Food } from '@foodsnap/shared';
import { createMatcher, normalize } from '../matcher.js';
import { foods } from '../foods.js';

const THRESHOLD = 0.45;

describe('normalize', () => {
  it('ignores case, padding and edge punctuation', () => {
    expect(normalize('  Hot Dog!  ')).toBe('hot dog');
    expect(normalize('Pizza.')).toBe('pizza');
  });

  it('collapses internal whitespace and underscores', () => {
    expect(normalize('french   fries')).toBe('french fries');
    expect(normalize('sweet_potato')).toBe('sweet potato');
  });

  it('keeps letters and digits inside the string', () => {
    expect(normalize('Pizza, pepperoni')).toBe('pizza, pepperoni');
  });
});

describe('createMatcher against the bundled database', () => {
  const matcher = createMatcher(foods, THRESHOLD);

  it('matches a canonical name exactly', () => {
    const result = matcher.match('pizza');
    expect(result?.food.name).toBe('Pizza');
    expect(result?.score).toBe(1);
  });

  it('is case-insensitive, as classifier labels are inconsistently cased', () => {
    expect(matcher.match('PIZZA')?.food.name).toBe('Pizza');
    expect(matcher.match('Hot Dog')?.food.name).toBe('Hot dog');
  });

  // The two cases the brief calls out by name.
  it('resolves multi-word labels like "hot dog"', () => {
    expect(matcher.match('hot dog')?.food.name).toBe('Hot dog');
  });

  it('resolves a variety name like "granny smith" to its food', () => {
    const result = matcher.match('granny smith');
    expect(result?.food.name).toBe('Apple');
    expect(result?.matchedOn).toBe('granny smith');
  });

  it('tolerates misspellings', () => {
    expect(matcher.match('chiken breast')?.food.name).toBe('Chicken breast');
    expect(matcher.match('spagetti')?.food.name).toBe('Pasta');
  });

  it('reports what it matched on, so the UI can admit an approximation', () => {
    const result = matcher.match('spagetti');
    expect(result?.matchedOn).toBe('spaghetti');
    expect(result?.score).toBeLessThan(1);
    expect(result?.score).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it('misses rather than guessing on gibberish', () => {
    expect(matcher.match('asdfghjkl')).toBeNull();
    expect(matcher.match('qqqqzzzzxxxx')).toBeNull();
  });

  it('treats blank input as a miss', () => {
    expect(matcher.match('')).toBeNull();
    expect(matcher.match('   ')).toBeNull();
  });

  it('never returns a result below the threshold', () => {
    const queries = ['pizza', 'granny smith', 'chiken', 'oat latte', 'crisps', 'aubergine'];
    for (const query of queries) {
      const score = matcher.match(query)?.score;
      if (score !== undefined) expect(score).toBeGreaterThanOrEqual(THRESHOLD);
    }
  });
});

describe('createMatcher with a controlled database', () => {
  const tiny: Food[] = [
    { name: 'Pizza', aliases: ['margherita'], per100g: { kcal: 266, protein: 11, carbs: 33, fat: 10 } },
    { name: 'Salad', aliases: [], per100g: { kcal: 55, protein: 2, carbs: 6, fat: 3 } },
  ];

  it('prefers an exact alias hit over a fuzzy name hit', () => {
    const matcher = createMatcher(tiny, THRESHOLD);
    const result = matcher.match('margherita');
    expect(result?.food.name).toBe('Pizza');
    expect(result?.score).toBe(1);
  });

  it('a stricter threshold rejects what a lenient one accepts', () => {
    expect(createMatcher(tiny, 0.3).match('pzza')?.food.name).toBe('Pizza');
    expect(createMatcher(tiny, 0.99).match('pzza')).toBeNull();
  });
});
