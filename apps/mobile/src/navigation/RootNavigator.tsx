import React from 'react';
import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CaptureScreen } from '../screens/CaptureScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { colors } from '../theme';

export type RootStackParamList = {
  Capture: undefined;
  Results: { imageUri: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// The app is dark-only (docs/DESIGN.md) — align the navigation chrome so no
// system-white surfaces ever flash between screens.
const foodSnapNavTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent.primary,
    background: colors.bg.screen,
    card: colors.bg.screen,
    text: colors.text.primary,
    border: colors.line.hairline,
    notification: colors.status.danger,
  },
  fonts: DarkTheme.fonts,
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={foodSnapNavTheme}>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg.screen },
        }}
      >
        <Stack.Screen
          name="Capture"
          component={CaptureScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Results"
          component={ResultsScreen}
          options={{ title: 'Result' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
