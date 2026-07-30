/**
 * Mocks for everything that only exists on a device.
 *
 * The brief is explicit that CI runs no emulator, so the native module is
 * mocked and the tests cover app logic only: ranking, request building, and
 * failure handling.
 */

// The TurboModule. Tests that care about its output override the resolved value.
jest.mock('react-native-food-classifier', () => ({
  classifyImage: jest.fn(async () => [
    { label: 'Food', confidence: 0.96 },
    { label: 'Pizza', confidence: 0.95 },
  ]),
  isAvailable: jest.fn(async () => true),
}));

// Values normally baked in from apps/mobile/.env at build time.
jest.mock('react-native-config', () => ({
  __esModule: true,
  default: { GATEWAY_URL: 'http://gateway.test', API_KEY: 'test-key' },
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

// react-native-mmkv 4 already swaps itself for an in-memory store when it sees
// JEST_WORKER_ID, so the history tests exercise the real module. What it cannot
// survive is its Nitro dependency, which calls TurboModuleRegistry.getEnforcing
// at import time and throws before that mock ever gets a chance. Stubbing the
// module keeps the import chain intact; MMKV takes it from there.
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(),
    box: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
  };
});

// vision-camera is a native view + hybrid object; under Jest there is no camera
// and no native module, so the Capture screen renders its "no camera" state.
jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevice: () => undefined,
  useCameraPermission: () => ({ hasPermission: false, requestPermission: jest.fn() }),
}));
