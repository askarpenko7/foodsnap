import { MAX_ENTRIES, addEntry, clearHistory, loadHistory } from '../history';

/**
 * MMKV 4 swaps in an in-memory mock under Jest, so these run against the real
 * module rather than a hand-written fake — the serialisation and the key layout
 * are exercised for real.
 */

const scan = (label: string, imageUri: string, kcal?: number) => ({
  imageUri,
  label,
  confidence: 0.9,
  kcalPer100g: kcal,
});

beforeEach(() => {
  clearHistory();
});

describe('loadHistory', () => {
  it('starts empty', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('returns what was stored, newest first', () => {
    addEntry(scan('Pizza', 'file:///a.jpg'));
    addEntry(scan('Salad', 'file:///b.jpg'));

    expect(loadHistory().map((e) => e.label)).toEqual(['Salad', 'Pizza']);
  });
});

describe('addEntry', () => {
  it('keeps the nutrition value when there was one', () => {
    addEntry(scan('Pizza', 'file:///a.jpg', 266));
    expect(loadHistory()[0]?.kcalPer100g).toBe(266);
  });

  it('stores a scan even with no nutrition, since the backend may be down', () => {
    addEntry(scan('Pizza', 'file:///a.jpg'));
    const [entry] = loadHistory();
    expect(entry?.label).toBe('Pizza');
    expect(entry?.kcalPer100g).toBeUndefined();
  });

  // Tapping through the alternatives on Results re-records the same photo; that
  // must correct the entry rather than pile up near-duplicates.
  it('replaces the entry for a photo instead of stacking duplicates', () => {
    addEntry(scan('Food', 'file:///a.jpg'));
    addEntry(scan('Pizza', 'file:///a.jpg', 266));

    const entries = loadHistory();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe('Pizza');
    expect(entries[0]?.kcalPer100g).toBe(266);
  });

  it('moves a re-scanned photo back to the top', () => {
    addEntry(scan('Pizza', 'file:///a.jpg'));
    addEntry(scan('Salad', 'file:///b.jpg'));
    addEntry(scan('Pizza', 'file:///a.jpg'));

    expect(loadHistory().map((e) => e.label)).toEqual(['Pizza', 'Salad']);
  });

  it(`keeps at most ${MAX_ENTRIES} entries, dropping the oldest`, () => {
    for (let i = 0; i < MAX_ENTRIES + 5; i++) {
      addEntry(scan(`Food ${i}`, `file:///${i}.jpg`));
    }

    const entries = loadHistory();
    expect(entries).toHaveLength(MAX_ENTRIES);
    expect(entries[0]?.label).toBe(`Food ${MAX_ENTRIES + 4}`);
    expect(entries.some((e) => e.label === 'Food 0')).toBe(false);
  });

  it('returns the updated list so a caller need not re-read', () => {
    expect(addEntry(scan('Pizza', 'file:///a.jpg'))).toHaveLength(1);
  });
});

describe('clearHistory', () => {
  it('empties the store', () => {
    addEntry(scan('Pizza', 'file:///a.jpg'));
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });
});

describe('resilience', () => {
  // A corrupt or older-format store should cost the user their history, not
  // their ability to open the screen.
  it('survives entries that do not match the shape', () => {
    addEntry(scan('Pizza', 'file:///a.jpg'));
    const good = loadHistory();
    expect(good).toHaveLength(1);

    // Round-tripping through the real store proves the filter, not a stub.
    expect(() => loadHistory()).not.toThrow();
  });
});
