import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { Macros } from '@foodsnap/shared';

/**
 * The diary — what was actually eaten, day by day, on this device only.
 *
 * This is the P4.2 store that absorbs P3.3's scan history: a scan only becomes
 * a diary entry when the user commits a portion ("Add N g"), so daily totals
 * are never polluted by photos that were merely classified. Like the history
 * store before it, MMKV gives synchronous reads (no empty first frame) and an
 * in-memory substitute under Jest.
 *
 * Entries are keyed by local day (`diary.entries.YYYY-MM-DD`) so yesterday's
 * list never has to be filtered out of today's, and targets live under their
 * own key. Nothing here leaves the phone.
 */

export interface DiaryEntry {
  /** Millisecond timestamp, and the entry's identity. */
  id: number;
  /** Display name of the food, e.g. "Pizza". */
  name: string;
  /** Portion size the user committed to. */
  grams: number;
  /** Macros for that portion, computed at log time from per-100 g values. */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Photo when the entry came from a scan; absent for search/manual logs. */
  imageUri?: string;
}

export interface DailyTargets extends Macros {}

/**
 * Sensible defaults until the user edits them in Settings (P4.6). There is no
 * nutritional advice embedded here — they are round numbers, not a plan.
 */
export const DEFAULT_TARGETS: DailyTargets = {
  kcal: 2200,
  protein: 120,
  carbs: 250,
  fat: 70,
};

const ENTRIES_PREFIX = 'diary.entries.';
const TARGETS_KEY = 'diary.targets';

// Lazy, not module scope: creating the Nitro instance during bundle evaluation
// races Nitro's own runtime install and segfaults the JS thread (observed on
// device: Nitro.Dispatcher installs, then SIGSEGV on mqt_v_js). The first call
// must happen after the app has started running JS.
let storage: MMKV | undefined;
function getStorage(): MMKV {
  storage ??= createMMKV({ id: 'foodsnap' });
  return storage;
}

/** Local day key: `YYYY-MM-DD` in the device's own timezone. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Shifts a day key by whole days, e.g. for the diary's ‹ › date navigation. */
export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

/**
 * The diary's big header: "Today", "Yesterday", or "Wednesday, 01.12.2026".
 *
 * Distinct from {@link dayLabel}, which is the uppercase short form the micro
 * labels use ("KCAL · TODAY"). The header showed both at once and read as
 * "Today Today", so they are now separate on purpose.
 */
export function dayTitle(key: string): string {
  if (key === dayKey()) return 'Today';
  if (key === shiftDay(dayKey(), -1)) return 'Yesterday';

  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  // Weekday follows the device locale; the numeric part is fixed DD.MM.YYYY so
  // it cannot silently reorder into the American form on some phones.
  const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${weekday}, ${dd}.${mm}.${date.getFullYear()}`;
}

/** "TODAY" / "YESTERDAY" / "MON 27 JUL" — the uppercase form for micro labels. */
export function dayLabel(key: string): string {
  if (key === dayKey()) return 'TODAY';
  if (key === shiftDay(dayKey(), -1)) return 'YESTERDAY';
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return date
    .toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' })
    .toUpperCase();
}

function isEntry(value: unknown): value is DiaryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'number' &&
    typeof e.name === 'string' &&
    typeof e.grams === 'number' &&
    typeof e.kcal === 'number' &&
    typeof e.protein === 'number' &&
    typeof e.carbs === 'number' &&
    typeof e.fat === 'number' &&
    (e.imageUri === undefined || typeof e.imageUri === 'string')
  );
}

function isTargets(value: unknown): value is DailyTargets {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  return ['kcal', 'protein', 'carbs', 'fat'].every(
    (k) => typeof t[k] === 'number' && (t[k] as number) > 0,
  );
}

/**
 * Entries for a day, oldest first (the order they were logged in). Anything
 * unreadable is discarded rather than thrown: a corrupt store costs entries,
 * not the screen.
 */
export function loadEntries(day: string): DiaryEntry[] {
  const raw = getStorage().getString(`${ENTRIES_PREFIX}${day}`);
  if (raw === undefined) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

function saveEntries(day: string, entries: DiaryEntry[]): void {
  getStorage().set(`${ENTRIES_PREFIX}${day}`, JSON.stringify(entries));
}

/** Logs an entry and returns the day's new list. */
export function addEntry(day: string, entry: Omit<DiaryEntry, 'id'> & { id?: number }): DiaryEntry[] {
  const next = [...loadEntries(day), { ...entry, id: entry.id ?? Date.now() }];
  saveEntries(day, next);
  return next;
}

export function loadTargets(): DailyTargets {
  const raw = getStorage().getString(TARGETS_KEY);
  if (raw === undefined) return DEFAULT_TARGETS;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isTargets(parsed) ? parsed : DEFAULT_TARGETS;
  } catch {
    return DEFAULT_TARGETS;
  }
}

export function saveTargets(targets: DailyTargets): void {
  getStorage().set(TARGETS_KEY, JSON.stringify(targets));
}

/** Consumed totals for a list of entries. */
export function totals(entries: DiaryEntry[]): Macros {
  return entries.reduce<Macros>(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Wipes every entry day and the targets — the Settings "Clear diary" action. */
export function clearDiary(): void {
  for (const key of getStorage().getAllKeys()) {
    if (key.startsWith(ENTRIES_PREFIX) || key === TARGETS_KEY) {
      getStorage().remove(key);
    }
  }
}
