import { createMMKV } from 'react-native-mmkv';
import {
  DEFAULT_TARGETS,
  addEntry,
  clearDiary,
  dayKey,
  dayLabel,
  loadEntries,
  loadTargets,
  saveTargets,
  shiftDay,
  totals,
} from '../diary';

/**
 * MMKV 4 swaps in an in-memory mock under Jest, so these run against the real
 * store — serialisation and the per-day key layout are exercised for real.
 */

const entry = (name: string, grams: number, kcal: number) => ({
  name,
  grams,
  kcal,
  protein: 10,
  carbs: 20,
  fat: 5,
});

const TODAY = dayKey();
const YESTERDAY = shiftDay(TODAY, -1);

beforeEach(() => {
  clearDiary();
});

describe('dayKey / shiftDay / dayLabel', () => {
  it('formats a local YYYY-MM-DD key', () => {
    expect(dayKey(new Date(2026, 6, 30))).toBe('2026-07-30');
  });

  it('shifts across month boundaries', () => {
    expect(shiftDay('2026-08-01', -1)).toBe('2026-07-31');
    expect(shiftDay('2026-07-31', 1)).toBe('2026-08-01');
  });

  it('labels today and yesterday by name', () => {
    expect(dayLabel(TODAY)).toBe('TODAY');
    expect(dayLabel(YESTERDAY)).toBe('YESTERDAY');
    expect(dayLabel('2020-01-05')).not.toBe('TODAY');
  });
});

describe('entries', () => {
  it('starts empty', () => {
    expect(loadEntries(TODAY)).toEqual([]);
  });

  it('returns entries oldest first, scoped to their own day', () => {
    addEntry(TODAY, entry('Pizza', 250, 665));
    addEntry(TODAY, entry('Salad', 180, 144));
    addEntry(YESTERDAY, entry('Pasta', 300, 393));

    expect(loadEntries(TODAY).map((e) => e.name)).toEqual(['Pizza', 'Salad']);
    expect(loadEntries(YESTERDAY).map((e) => e.name)).toEqual(['Pasta']);
  });

  it('drops unreadable entries rather than throwing', () => {
    addEntry(TODAY, entry('Pizza', 250, 665));
    addEntry(TODAY, { ...entry('Broken', 0, 0), grams: 'lots' as unknown as number });
    expect(loadEntries(TODAY).map((e) => e.name)).toEqual(['Pizza']);
  });
});

describe('totals', () => {
  it('sums macros across entries', () => {
    addEntry(TODAY, entry('Pizza', 250, 665));
    addEntry(TODAY, entry('Salad', 180, 144));
    expect(totals(loadEntries(TODAY))).toEqual({ kcal: 809, protein: 20, carbs: 40, fat: 10 });
  });

  it('is zero for an empty day', () => {
    expect(totals([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe('targets', () => {
  it('falls back to defaults when nothing was saved', () => {
    expect(loadTargets()).toEqual(DEFAULT_TARGETS);
  });

  it('round-trips saved targets', () => {
    saveTargets({ kcal: 1800, protein: 140, carbs: 180, fat: 60 });
    expect(loadTargets()).toEqual({ kcal: 1800, protein: 140, carbs: 180, fat: 60 });
  });

  it('rejects nonsense values back to defaults', () => {
    // Corrupt the raw store directly — a hand-edited or older-format value
    // must not reach the UI.
    createMMKV({ id: 'foodsnap' }).set('diary.targets', JSON.stringify({ kcal: -5 }));
    expect(loadTargets()).toEqual(DEFAULT_TARGETS);
  });
});

describe('clearDiary', () => {
  it('wipes entries for every day and the targets', () => {
    addEntry(TODAY, entry('Pizza', 250, 665));
    addEntry(YESTERDAY, entry('Pasta', 300, 393));
    saveTargets({ kcal: 1800, protein: 140, carbs: 180, fat: 60 });

    clearDiary();

    expect(loadEntries(TODAY)).toEqual([]);
    expect(loadEntries(YESTERDAY)).toEqual([]);
    expect(loadTargets()).toEqual(DEFAULT_TARGETS);
  });
});
