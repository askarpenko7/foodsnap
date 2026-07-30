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

/** Levenshtein edit distance, iterative with a single row of state. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      const insertion = current[j - 1]! + 1;
      const deletion = previous[j]! + 1;
      current[j] = Math.min(substitution, insertion, deletion);
    }
    previous = current;
  }

  return previous[b.length]!;
}

/**
 * Similarity on 0..1, 1 being identical.
 *
 * Whole-string, deliberately. fuse.js was the first choice and had to be
 * replaced: its bitap search matches a short query *inside* a longer key, which
 * on a database of short food names produced confident nonsense — "xyzzy" scored
 * 0.48 against "fizzy drink", "sky" 0.54 against "streaky bacon", "outdoor"
 * 0.57 against "hotdog". Edit distance over the full string has no such failure
 * mode: a query only scores well when it is nearly the whole key, which is
 * exactly the "did they misspell it" question being asked.
 */
export function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - editDistance(a, b) / longest;
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

  return {
    match(query: string): MatchResult | null {
      const normalized = normalize(query);
      if (normalized === '') return null;

      const hit = exact.get(normalized);
      if (hit) return { food: hit.food, matchedOn: hit.key, score: 1 };

      // ~470 short keys: a linear scan is microseconds and avoids the index
      // being a second thing that can be wrong.
      let best: MatchResult | null = null;
      for (const entry of entries) {
        const score = similarity(normalized, entry.key);
        if (score >= minScore && (best === null || score > best.score)) {
          best = { food: entry.food, matchedOn: entry.key, score };
        }
      }
      return best;
    },
  };
}
