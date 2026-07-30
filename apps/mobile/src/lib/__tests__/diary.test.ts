import { createMMKV } from 'react-native-mmkv';
import {
  DEFAULT_TARGETS,
  addEntry,
  clearDiary,
  dayKey,
  dayLabel,
  dayTitle,
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

/**
 * The header used to render dayLabel and a title together, which read as
 * "Today Today" and as "Diary" for any past date.
 */
describe('dayTitle', () => {
  it('names today and yesterday in words', () => {
    expect(dayTitle(TODAY)).toBe('Today');
    expect(dayTitle(YESTERDAY)).toBe('Yesterday');
  });

  it('renders an older day as weekday plus DD.MM.YYYY', () => {
    // 2026-12-01 is a Tuesday.
    expect(dayTitle('2026-12-01')).toMatch(/^\w+, 01\.12\.2026$/);
  });

  it('zero-pads single-digit days and months', () => {
    expect(dayTitle('2026-03-05')).toContain('05.03.2026');
  });

  it('never returns the uppercase micro form the header used to show', () => {
    expect(dayTitle(TODAY)).not.toBe(dayLabel(TODAY));
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

/**
 * The path P4.3 restores: until the portion editor existed, nothing in the app
 * called addEntry, so the diary could never fill. These pin the shape the
 * editor writes.
 */
describe('entries logged from the portion editor', () => {
  it('stores the computed macros for the portion, not per-100 g values', () => {
    // Two slices of pizza: 256 g of a 266 kcal/100 g food.
    addEntry(TODAY, {
      name: 'Pizza',
      grams: 256,
      kcal: 680.96,
      protein: 28.16,
      carbs: 84.48,
      fat: 25.6,
      imageUri: 'file:///scan.jpg',
    });

    const [logged] = loadEntries(TODAY);
    expect(logged?.grams).toBe(256);
    expect(logged?.kcal).toBeCloseTo(680.96, 2);
    expect(logged?.imageUri).toBe('file:///scan.jpg');
  });

  it('accepts an entry with no photo, for search and manual logs', () => {
    addEntry(TODAY, entry('Salad', 180, 99));
    expect(loadEntries(TODAY)[0]?.imageUri).toBeUndefined();
  });

  it('keeps every portion of the same food rather than replacing it', () => {
    // Unlike the old scan history, eating pizza twice is two diary entries.
    addEntry(TODAY, entry('Pizza', 128, 340));
    addEntry(TODAY, entry('Pizza', 128, 340));

    const entries = loadEntries(TODAY);
    expect(entries).toHaveLength(2);
    expect(totals(entries).kcal).toBe(680);
  });

  it('feeds straight into the day totals the summary card renders', () => {
    addEntry(TODAY, entry('Pizza', 256, 681));
    addEntry(TODAY, entry('Latte', 240, 132));
    expect(Math.round(totals(loadEntries(TODAY)).kcal)).toBe(813);
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
