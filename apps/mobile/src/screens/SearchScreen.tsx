/**
 * SearchScreen — design concept screen 2 (docs/DESIGN.md §5): search field with
 * Cancel, a `N OF 139 FOODS · FUZZY MATCH` micro-label, result rows with a `+`,
 * and the dashed "Nothing fits? Enter it by hand" row.
 *
 * Search needs the gateway; manual entry does not, so the dashed row stays
 * available — and prominent — when the backend is unreachable.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FoodSearchResult } from '@foodsnap/shared';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ApiError, searchFoods } from '../api/client';
import { Notice } from '../components/Notice';
import { colors, radii, spacing, type } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Search'>;

/** Long enough that typing does not fire a request per keystroke. */
const DEBOUNCE_MS = 250;

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; results: FoodSearchResult[]; total: number }
  | { status: 'failed'; message: string };

function ResultRow({ food, onPress }: { food: FoodSearchResult; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{food.name}</Text>
        <Text style={styles.rowMeta}>{Math.round(food.per100g.kcal)} kcal / 100 g</Text>
      </View>
      <View style={styles.plus}>
        <Text style={styles.plusGlyph}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

export function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ status: 'idle' });

  // Guards against an earlier, slower response overwriting a later one.
  const latest = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === '') {
      setState({ status: 'idle' });
      return;
    }

    const ticket = ++latest.current;
    setState({ status: 'loading' });

    const timer = setTimeout(() => {
      searchFoods(trimmed)
        .then((response) => {
          if (ticket !== latest.current) return;
          setState({ status: 'ready', results: response.results, total: response.total });
        })
        .catch((error: unknown) => {
          if (ticket !== latest.current) return;
          const message =
            error instanceof ApiError
              ? error.failure.message
              : 'Could not search the food database.';
          setState({ status: 'failed', message });
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const openPortion = useCallback(
    (food: FoodSearchResult) => {
      navigation.navigate('Portion', {
        name: food.name,
        per100g: food.per100g,
        ...(food.servings === undefined ? {} : { servings: food.servings }),
      });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.field}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search foods"
            placeholderTextColor={colors.text.faint}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search the food database"
          />
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {state.status === 'ready' && (
        <Text style={styles.micro}>
          {state.results.length} OF {state.total} FOODS · FUZZY MATCH
        </Text>
      )}
      {state.status === 'loading' && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent.primaryText} size="small" />
          <Text style={styles.microPlain}>SEARCHING…</Text>
        </View>
      )}

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        data={state.status === 'ready' ? state.results : []}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => <ResultRow food={item} onPress={() => openPortion(item)} />}
        ListHeaderComponent={
          state.status === 'failed' ? (
            <Notice
              tone={colors.macro.carbs}
              title="Search is offline"
              body={`${state.message} You can still add a food by hand below — that never needs the network.`}
            />
          ) : null
        }
        ListEmptyComponent={
          state.status === 'ready' && state.results.length === 0 ? (
            <Text style={styles.empty}>Nothing matches “{query.trim()}”.</Text>
          ) : null
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.manualRow}
            onPress={() => navigation.navigate('ManualEntry')}
            accessibilityRole="button"
          >
            <View style={styles.rowBody}>
              <Text style={styles.manualTitle}>Nothing fits? Enter it by hand</Text>
              <Text style={styles.manualBody}>Name, portion and four numbers</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.screen },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.gutter,
    paddingTop: 8,
  },
  field: {
    flex: 1,
    height: 46,
    borderRadius: radii.input,
    backgroundColor: colors.surface.input,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  input: { ...type.body, color: colors.text.primary, padding: 0 },
  cancel: { ...type.bodyEmphasis, color: colors.accent.primaryText },
  micro: {
    ...type.microLabel,
    color: colors.text.faint,
    paddingHorizontal: spacing.gutter,
    marginTop: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.gutter,
    marginTop: 12,
  },
  microPlain: { ...type.microLabel, color: colors.text.faint },
  list: { flex: 1, marginTop: 12 },
  listContent: { paddingHorizontal: spacing.gutter, paddingBottom: 24, gap: 9 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface.card,
    borderRadius: radii.row,
    paddingHorizontal: 17,
    paddingVertical: 15,
  },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { ...type.bodyEmphasis, color: colors.text.primary },
  rowMeta: { ...type.monoMeta, color: colors.text.tertiary },
  plus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.fill.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusGlyph: { fontSize: 18, lineHeight: 21, color: colors.text.primary },
  empty: { ...type.caption, color: colors.text.secondary, paddingVertical: 8 },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    borderRadius: radii.row,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.glass.border,
    paddingHorizontal: 17,
    paddingVertical: 15,
  },
  manualTitle: { ...type.bodyEmphasis, fontSize: 15, color: colors.text.primary },
  manualBody: { ...type.caption, fontSize: 12, color: colors.text.faint },
  chevron: { fontSize: 17, color: colors.text.tertiary },
});
