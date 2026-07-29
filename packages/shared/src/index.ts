/**
 * The FoodSnap API contract.
 *
 * Imported by `apps/mobile`, `services/gateway` and `services/nutrition-api`,
 * so a change here breaks the build on whichever side failed to keep up —
 * which is the point. Nothing in this package may import from a workspace,
 * pull in a runtime dependency, or touch Node or React Native APIs.
 */

/** Nutrition per 100 g. Grams for the macros, kcal for energy. */
export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** One entry of the bundled food database (`services/nutrition-api/data/foods.json`). */
export interface Food {
  /** Canonical display name, e.g. "Pizza". */
  name: string;
  /**
   * Alternative spellings the fuzzy matcher should also accept — this is what
   * makes real classifier output ("hot dog", "granny smith") resolve.
   */
  aliases: string[];
  per100g: Macros;
}

/** How a query resolved, so the UI can admit it showed something adjacent. */
export interface MatchInfo {
  /** The food string as requested. */
  query: string;
  /** The name or alias that actually matched. */
  matchedOn: string;
  /** 1 = exact, decreasing with edit distance. Never below the server threshold. */
  score: number;
}

/** 200 body of `GET /api/v1/nutrition/:food`. */
export interface NutritionResponse {
  name: string;
  per100g: Macros;
  match: MatchInfo;
}

/** 200 body of `GET /health` on either service. */
export interface HealthResponse {
  status: 'ok';
  service: string;
  /** Seconds since process start, rounded. */
  uptime: number;
}

export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'RATE_LIMITED',
  'UPSTREAM_UNAVAILABLE',
  'INTERNAL',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Every non-2xx response from the gateway or the service uses this shape. */
export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Gateway request id, so a user-reported failure can be found in the logs. */
    requestId?: string;
  };
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const { error } = value as { error: unknown };
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    typeof message === 'string' &&
    typeof code === 'string' &&
    (API_ERROR_CODES as readonly string[]).includes(code)
  );
}

/** Header the gateway authenticates with. */
export const API_KEY_HEADER = 'x-api-key';

/** Public path prefix. The gateway owns it; the nutrition service sits behind it. */
export const API_BASE_PATH = '/api/v1';

/**
 * Builds the public nutrition path. Both the app and the gateway's route
 * registration derive from this, so the version prefix lives in exactly one place.
 */
export function nutritionPath(food: string): string {
  return `${API_BASE_PATH}/nutrition/${encodeURIComponent(food)}`;
}
