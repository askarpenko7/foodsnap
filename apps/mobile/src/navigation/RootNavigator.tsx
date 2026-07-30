import React from 'react';
import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { Macros, Serving } from '@foodsnap/shared';
import { CaptureScreen } from '../screens/CaptureScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { PortionScreen } from '../screens/PortionScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { ManualEntryScreen } from '../screens/ManualEntryScreen';
import { DiaryScreen } from '../screens/DiaryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { GlassTabBar } from './GlassTabBar';
import { colors } from '../theme';

export type RootStackParamList = {
  Main: undefined;
  Capture: undefined;
  Results: { imageUri: string };
  Portion: {
    name: string;
    per100g: Macros;
    servings?: Serving[];
    /** Carried through so the diary row can show the photo that was scanned. */
    imageUri?: string;
  };
  Search: undefined;
  ManualEntry: undefined;
};

export type MainTabParamList = {
  Diary: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

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

/**
 * Home is the Diary/Settings tab pair behind the floating glass tab bar
 * (P4.1). Snap is not a tab — it opens the capture flow as a full-screen
 * modal over whatever tab is active, per the design concept.
 */
function MainTabs() {
  return (
    <Tabs.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="Diary" component={DiaryScreen} />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer theme={foodSnapNavTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg.screen },
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="Capture"
          component={CaptureScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
        {/* Headerless: the design puts the photo full-bleed under the status
            bar, with a glass "Retake" chip standing in for a back button. */}
        <Stack.Screen name="Results" component={ResultsScreen} />
        {/* Sheet over Results: dismissing it leaves the scan untouched. */}
        <Stack.Screen
          name="Portion"
          component={PortionScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="ManualEntry"
          component={ManualEntryScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
