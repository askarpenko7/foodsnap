import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { NutritionResponse } from '@foodsnap/shared';

/**
 * Last-known nutrition per food, so a lookup that cannot reach the gateway can
 * still answer for anything looked up before.
 *
 * This is what makes the concept's "Numbers came from cache" notice honest: the
 * app shows real values it once received, and says plainly where they came from,
 * rather than either inventing them or going blank. Labels never needed the
 * network in the first place, so a cached hit degrades only the freshness.
 */

const PREFIX = 'nutrition.cache.';

export interface CachedNutrition {
  data: NutritionResponse;
  /** When it was fetched, for the notice and for eviction. */
  cachedAt: number;
}

/**
 * Old numbers are still the right numbers — a food's macros do not drift — so
 * this exists to bound the store, not to protect correctness.
 */
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

// Lazy for the same reason as the diary store: constructing a Nitro instance
// during bundle evaluation races Nitro's own install and segfaults the JS thread.
let storage: MMKV | undefined;
function getStorage(): MMKV {
  storage ??= createMMKV({ id: 'foodsnap' });
  return storage;
}

/** Cache key is the queried label, normalised — "Pizza" and "pizza" are one food. */
function keyFor(food: string): string {
  return `${PREFIX}${food.trim().toLowerCase()}`;
}

export function readCache(food: string): CachedNutrition | null {
  const raw = getStorage().getString(keyFor(food));
  if (raw === undefined) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { data, cachedAt } = parsed as { data?: unknown; cachedAt?: unknown };
    if (typeof cachedAt !== 'number' || typeof data !== 'object' || data === null) return null;

    const { name, per100g } = data as { name?: unknown; per100g?: unknown };
    if (typeof name !== 'string' || typeof per100g !== 'object' || per100g === null) return null;

    if (Date.now() - cachedAt > MAX_AGE_MS) {
      getStorage().remove(keyFor(food));
      return null;
    }
    return { data: data as NutritionResponse, cachedAt };
  } catch {
    return null;
  }
}

export function writeCache(food: string, data: NutritionResponse): void {
  getStorage().set(keyFor(food), JSON.stringify({ data, cachedAt: Date.now() }));
}

/** Part of Settings' "Clear diary & history" — cached numbers are user data too. */
export function clearNutritionCache(): void {
  for (const key of getStorage().getAllKeys()) {
    if (key.startsWith(PREFIX)) getStorage().remove(key);
  }
}
