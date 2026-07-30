import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { TokenGalleryScreen } from './src/screens/dev/TokenGalleryScreen';
import { colors } from './src/theme';

// DEV_TOKEN_GALLERY: flip to true to eyeball the theme against docs/DESIGN.md.
const SHOW_TOKEN_GALLERY = false;

export default function App() {
  // initialMetrics matters more than it looks: a screen presented as a native
  // modal lives in its own container, and without seeded metrics the provider
  // reports zero insets there — which put the Capture screen's close button
  // underneath the status bar clock on a notched iPhone.
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.screen} />
      {SHOW_TOKEN_GALLERY ? <TokenGalleryScreen /> : <RootNavigator />}
    </SafeAreaProvider>
  );
}
