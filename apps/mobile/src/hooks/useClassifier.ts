import { useCallback, useEffect, useState } from 'react';
import { classifyImage, type Classification } from 'react-native-food-classifier';

export type ClassifierState =
  | { status: 'loading' }
  | { status: 'error'; code: string; message: string }
  | { status: 'ready'; results: Classification[] };

/**
 * Runs the on-device classifier TurboModule against a local image URI.
 * Classifications never need the network — only the nutrition lookup does
 * (and that arrives in Phase 2).
 */
export function useClassifier(imageUri: string) {
  const [state, setState] = useState<ClassifierState>({ status: 'loading' });

  const run = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const results = await classifyImage(imageUri);
      setState({ status: 'ready', results });
    } catch (error) {
      const e = error as { code?: string; message?: string };
      setState({
        status: 'error',
        code: e.code ?? 'E_CLASSIFICATION_FAILED',
        message: e.message ?? 'Classification failed',
      });
    }
  }, [imageUri]);

  useEffect(() => {
    void run();
  }, [run]);

  return { state, retry: run };
}
