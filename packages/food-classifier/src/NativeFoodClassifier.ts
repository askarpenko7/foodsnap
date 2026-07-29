import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Classification {
  /** e.g. "pizza" — ML Kit / Vision label text. */
  label: string;
  /** 0..1 — model confidence. */
  confidence: number;
}

export interface Spec extends TurboModule {
  /**
   * Classify an image at a local file URI.
   * Resolves the top 5 labels by confidence descending, labels with
   * confidence < 0.1 filtered out.
   * Rejects with coded errors: E_FILE_NOT_FOUND, E_CLASSIFICATION_FAILED.
   */
  classifyImage(uri: string): Promise<Classification[]>;
  /** Whether the on-device model/framework is ready on this device. */
  isAvailable(): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('FoodClassifier');
