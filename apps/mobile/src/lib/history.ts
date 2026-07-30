import { createMMKV } from 'react-native-mmkv';

/**
 * Local scan history — the last 20 snaps, on this device only.
 *
 * MMKV rather than AsyncStorage because reads are synchronous, so the History
 * screen renders populated on its first frame instead of flashing empty. Nothing
 * here leaves the phone; syncing is a roadmap item and would need an account.
 *
 * MMKV 4 is a Nitro module and hands out instances through `createMMKV` — the
 * `new MMKV()` of earlier majors is gone, and `MMKV` is now only a type. It also
 * substitutes an in-memory mock under Jest, so this module is testable without
 * the native side.
 */

export interface HistoryEntry {
  /** Millisecond timestamp, and the entry's identity. */
  id: number;
  /** Local file URI of the photo the user snapped. */
  imageUri: string;
  /** The label the user settled on, not necessarily the top hit. */
  label: string;
  confidence: number;
  /** Filled in only when the nutrition lookup succeeded. */
  kcalPer100g?: number;
}

/** The design's diary shows a short, scannable list; more is not useful. */
export const MAX_ENTRIES = 20;

const STORAGE_KEY = 'history.entries';

const storage = createMMKV({ id: 'foodsnap' });

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'number' &&
    typeof e.imageUri === 'string' &&
    typeof e.label === 'string' &&
    typeof e.confidence === 'number' &&
    (e.kcalPer100g === undefined || typeof e.kcalPer100g === 'number')
  );
}

/**
 * Stored entries, newest first. Anything unreadable is discarded rather than
 * thrown: a corrupt or older-format store should cost the user their history,
 * not the ability to open the screen.
 */
export function loadHistory(): HistoryEntry[] {
  const raw = storage.getString(STORAGE_KEY);
  if (raw === undefined) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function save(entries: HistoryEntry[]): void {
  storage.set(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Records a scan and returns the new list. Re-classifying the same photo
 * replaces its entry rather than stacking duplicates, which is what happens
 * whenever someone taps through the alternatives on the Results screen.
 */
export function addEntry(entry: Omit<HistoryEntry, 'id'> & { id?: number }): HistoryEntry[] {
  const existing = loadHistory().filter((e) => e.imageUri !== entry.imageUri);
  const next: HistoryEntry[] = [
    { ...entry, id: entry.id ?? Date.now() },
    ...existing,
  ].slice(0, MAX_ENTRIES);
  save(next);
  return next;
}

export function clearHistory(): void {
  // `remove`, not `delete` — another MMKV 4 rename.
  storage.remove(STORAGE_KEY);
}
