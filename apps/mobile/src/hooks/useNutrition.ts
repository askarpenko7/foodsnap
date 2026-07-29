import { useCallback, useEffect, useState } from 'react';
import type { NutritionResponse } from '@foodsnap/shared';
import { ApiError, fetchNutrition, type ApiFailure } from '../api/client';

export type NutritionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: NutritionResponse }
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
      setState({ status: 'ready', data: await fetchNutrition(food) });
    } catch (error) {
      if (error instanceof ApiError) {
        const notInDatabase = error.failure.kind === 'api' && error.failure.code === 'NOT_FOUND';
        setState(
          notInDatabase ? { status: 'unknownFood' } : { status: 'failed', failure: error.failure },
        );
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
