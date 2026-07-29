/**
 * Notice card — docs/DESIGN.md §3: subtle fill, hairline border, a coloured dot
 * carrying the severity, title and body. Used for every "this didn't work but
 * the app still does" state.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, type } from '../theme';

export function Notice({ tone, title, body }: { tone: string; title: string; body: string }) {
  return (
    <View style={styles.notice}>
      <View style={[styles.dot, { backgroundColor: tone }]} />
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.fill.subtle,
    borderColor: colors.bar.track,
    borderWidth: 1,
    borderRadius: radii.row,
    padding: 14,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  text: { ...type.caption, color: colors.text.secondary, lineHeight: 19 },
});
