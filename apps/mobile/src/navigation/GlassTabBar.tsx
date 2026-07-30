/**
 * Floating glass tab bar — docs/DESIGN.md §4/§5: h78, r39, glass.tabBar
 * preset, center 60px Snap button elevated −30px.
 *
 * Glyphs are drawn with plain views instead of pulling in an icon library for
 * three shapes. Glass is the documented degrade path (solid fill at high
 * alpha, same border/shadow) — a native BlurView stays a possible polish, not
 * a dependency the MVP needs.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './RootNavigator';
import { colors, glass, type } from '../theme';

function DiaryGlyph({ color }: { color: string }) {
  return (
    <View style={styles.glyphBox}>
      {[18, 13, 16].map((width, i) => (
        <View key={i} style={[styles.diaryBar, { width, backgroundColor: color }]} />
      ))}
    </View>
  );
}

function SettingsGlyph({ color }: { color: string }) {
  return (
    <View style={[styles.glyphBox, { gap: 7 }]}>
      {[false, true].map((knobRight, i) => (
        <View key={i} style={styles.sliderRow}>
          <View style={[styles.sliderTrack, { backgroundColor: color }]} />
          <View
            style={[
              styles.sliderKnob,
              { backgroundColor: color },
              knobRight ? { right: 2 } : { left: 2 },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function CameraGlyph({ color }: { color: string }) {
  return (
    <View style={[styles.cameraBody, { borderColor: color }]}>
      <View style={[styles.cameraLens, { borderColor: color }]} />
    </View>
  );
}

function TabButton({
  label,
  focused,
  onPress,
  children,
}: {
  label: string;
  focused: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const color = focused ? colors.text.primary : colors.text.faint;
  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View style={styles.tabInner}>
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<{ color: string }>, { color })
          : children}
        <Text style={[styles.tabLabel, { color }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const rootNavigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };
    return { key: route.key, name: route.name, focused, onPress };
  });

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 12 }]} pointerEvents="box-none">
      <View style={[styles.bar, glass.tabBar]}>
        {tabs[0] && (
          <TabButton label="Diary" focused={tabs[0].focused} onPress={tabs[0].onPress}>
            <DiaryGlyph color={colors.text.primary} />
          </TabButton>
        )}

        <TouchableOpacity
          style={styles.snapButton}
          onPress={() => rootNavigation.navigate('Capture')}
          accessibilityRole="button"
          accessibilityLabel="Snap a photo of your food"
        >
          <CameraGlyph color={colors.cta.text} />
        </TouchableOpacity>

        {tabs[1] && (
          <TabButton label="Settings" focused={tabs[1].focused} onPress={tabs[1].onPress}>
            <SettingsGlyph color={colors.text.primary} />
          </TabButton>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 78,
    width: '88%',
    borderRadius: 39,
    paddingHorizontal: 34,
  },
  tab: { minWidth: 72, alignItems: 'center' },
  tabInner: { alignItems: 'center', gap: 6 },
  tabLabel: { ...type.microLabel, fontSize: 10 },
  glyphBox: { height: 22, justifyContent: 'center', gap: 4 },
  diaryBar: { height: 2.5, borderRadius: 1.5 },
  sliderRow: { width: 22, height: 8, justifyContent: 'center' },
  sliderTrack: { height: 2.5, borderRadius: 1.5, opacity: 0.7 },
  sliderKnob: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  snapButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: -30,
    backgroundColor: colors.cta.bg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  cameraBody: {
    width: 26,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLens: { width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
});
