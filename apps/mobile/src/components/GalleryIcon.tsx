/**
 * Gallery glyph, drawn with plain views like the tab bar's icons — the project
 * carries no icon library, and three rectangles do not justify adding one.
 *
 * A photo frame with a horizon line and a sun, which reads as "pictures" at
 * 22px far better than a literal stack of cards does.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function GalleryIcon({ size = 22, color = colors.text.primary }: { size?: number; color?: string }) {
  const border = Math.max(1.6, size * 0.09);
  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: size * 0.22, borderWidth: border, borderColor: color },
      ]}
    >
      {/* Sun, top-left. */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.12,
          left: size * 0.12,
          width: size * 0.17,
          height: size * 0.17,
          borderRadius: size * 0.09,
          backgroundColor: color,
        }}
      />
      {/* Hillside, filling the lower third. */}
      <View
        style={{
          position: 'absolute',
          left: -border,
          right: -border,
          bottom: -border,
          height: size * 0.4,
          backgroundColor: color,
          borderBottomLeftRadius: size * 0.14,
          borderBottomRightRadius: size * 0.14,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
});
