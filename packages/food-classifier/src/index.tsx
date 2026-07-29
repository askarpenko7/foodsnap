import NativeFoodClassifier from './NativeFoodClassifier';
import type { Classification } from './NativeFoodClassifier';

export type { Classification };

export function classifyImage(uri: string): Promise<Classification[]> {
  return NativeFoodClassifier.classifyImage(uri);
}

export function isAvailable(): Promise<boolean> {
  return NativeFoodClassifier.isAvailable();
}
