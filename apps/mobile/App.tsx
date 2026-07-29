import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { TokenGalleryScreen } from './src/screens/dev/TokenGalleryScreen';
import { colors } from './src/theme';

// DEV_TOKEN_GALLERY: flip to true to eyeball the theme against docs/DESIGN.md.
const SHOW_TOKEN_GALLERY = false;

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.screen} />
      {SHOW_TOKEN_GALLERY ? <TokenGalleryScreen /> : <RootNavigator />}
    </SafeAreaProvider>
  );
}
