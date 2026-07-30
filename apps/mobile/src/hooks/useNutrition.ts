import { useCallback, useEffect, useState } from 'react';
import type { NutritionResponse } from '@foodsnap/shared';
import { ApiError, fetchNutrition, type ApiFailure } from '../api/client';
import { readCache, writeCache } from '../lib/nutritionCache';

export type NutritionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: NutritionResponse }
  /** Served from the last successful lookup because the gateway did not answer. */
  | { status: 'cached'; data: NutritionResponse; cachedAt: number }
  /** The food is not in the database — a normal outcome, not an error. */
  | { status: 'unknownFood' }
  | { status: 'failed'; failure: ApiFailure };

/**
 * Looks up nutrition for the currently selected label.
 *
 * Every failure mode is survivable: classification already happened on-device,
 * so the screen keeps showing labels and only the nutrition card degrades.
 */
export function useNutrition(food: string | undefined) {
  const [state, setState] = useState<NutritionState>({ status: 'idle' });

  const run = useCallback(async () => {
    if (!food) {
      setState({ status: 'idle' });
      return;
    }

    setState({ status: 'loading' });
    try {
      const data = await fetchNutrition(food);
      writeCache(food, data);
      setState({ status: 'ready', data });
    } catch (error) {
      if (error instanceof ApiError) {
        const notInDatabase = error.failure.kind === 'api' && error.failure.code === 'NOT_FOUND';
        if (notInDatabase) {
          setState({ status: 'unknownFood' });
          return;
        }

        // Unreachable, but seen before: show the real numbers we already have
        // and say where they came from. A structured refusal (401, 429) is not
        // a connectivity problem, so it does not get the cache treatment.
        if (error.failure.kind === 'unreachable') {
          const cached = readCache(food);
          if (cached !== null) {
            setState({ status: 'cached', data: cached.data, cachedAt: cached.cachedAt });
            return;
          }
        }

        setState({ status: 'failed', failure: error.failure });
        return;
      }
      setState({
        status: 'failed',
        failure: { kind: 'unreachable', message: 'Unexpected error looking up nutrition.' },
      });
    }
  }, [food]);

  useEffect(() => {
    void run();
  }, [run]);

  return { state, retry: run };
}
