import Fuse from 'fuse.js';
import type { Food } from '@foodsnap/shared';

/**
 * Resolves a free-text food label to a database entry.
 *
 * The queries are classifier output, not typed search terms, so they arrive
 * capitalised oddly ("Hot dog"), pluralised, or naming a variety rather than a
 * food ("granny smith"). Exact and alias hits are answered from a map; anything
 * else falls through to fuzzy search, and anything below the threshold is a
 * miss — returning a confidently wrong number is worse than a 404.
 */

export interface MatchResult {
  food: Food;
  /** The name or alias that matched, for the response's `match.matchedOn`. */
  matchedOn: string;
  /** 1 = exact, decreasing with distance. Never below the configured threshold. */
  score: number;
}

export interface Matcher {
  match(query: string): MatchResult | null;
}

/** Keys are compared normalised: case, spacing and edge punctuation are noise. */
export function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

interface IndexEntry {
  key: string;
  food: Food;
}

export function createMatcher(foods: Food[], minScore: number): Matcher {
  const entries: IndexEntry[] = [];
  const exact = new Map<string, IndexEntry>();

  for (const food of foods) {
    for (const key of [food.name, ...food.aliases]) {
      const entry = { key: normalize(key), food };
      entries.push(entry);
      // parseFoods() rejects duplicates, so first write always wins uncontested.
      exact.set(entry.key, entry);
    }
  }

  const fuse = new Fuse(entries, {
    keys: ['key'],
    includeScore: true,
    // Fuse scores 0 as perfect and 1 as hopeless — the inverse of our contract.
    threshold: 1 - minScore,
    // Without this a match near the end of a long alias is penalised for
    // position alone, which has nothing to do with whether it is the right food.
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  return {
    match(query: string): MatchResult | null {
      const normalized = normalize(query);
      if (normalized === '') return null;

      const hit = exact.get(normalized);
      if (hit) return { food: hit.food, matchedOn: hit.key, score: 1 };

      const [best] = fuse.search(normalized, { limit: 1 });
      if (!best || best.score === undefined) return null;

      const score = 1 - best.score;
      if (score < minScore) return null;
      return { food: best.item.food, matchedOn: best.item.key, score };
    },
  };
}
