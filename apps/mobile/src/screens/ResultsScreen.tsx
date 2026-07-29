/**
 * ResultsScreen — stub for P1.7 navigation wiring.
 * The full styled breakdown (classification list + nutrition card) lands in
 * P1.13, after the food-classifier TurboModule exists.
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

export function ResultsScreen({ route }: Props) {
  const { imageUri } = route.params;
  return (
    <View style={styles.screen}>
      <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
      <View style={styles.body}>
        <Text style={styles.micro}>CLASSIFIER PENDING</Text>
        <Text style={styles.text}>
          The on-device classifier (packages/food-classifier) is wired up in P1.9–P1.11; the full
          breakdown UI lands in P1.13.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.screen },
  photo: { width: '100%', height: 280, backgroundColor: colors.thumb.stripeA },
  body: { padding: spacing.gutter, gap: 8 },
  micro: { ...type.microLabel, color: colors.accent.primaryText },
  text: { ...type.body, color: colors.text.secondary },
});
