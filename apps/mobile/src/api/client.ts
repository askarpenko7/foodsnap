import Config from 'react-native-config';
import {
  API_KEY_HEADER,
  foodSearchPath,
  isApiErrorResponse,
  nutritionPath,
  type ApiErrorCode,
  type FoodSearchResponse,
  type NutritionResponse,
} from '@foodsnap/shared';

/**
 * Typed client for the gateway. Deliberately a thin `fetch` wrapper: there is
 * one endpoint, and a data-fetching library would be more moving parts than the
 * problem has.
 *
 * Paths and the api-key header name come from @foodsnap/shared, so the app
 * cannot drift from what the gateway actually serves.
 */

/** Long enough for a cold container, short enough not to feel broken. */
const REQUEST_TIMEOUT_MS = 6_000;

export type ApiFailure =
  /** Never reached the gateway — no network, wrong URL, stack not running. */
  | { kind: 'unreachable'; message: string }
  /** Reached it and got a structured refusal. */
  | { kind: 'api'; code: ApiErrorCode; status: number; message: string }
  /** Reached it and got something unexpected. */
  | { kind: 'malformed'; status: number; message: string };

export class ApiError extends Error {
  readonly failure: ApiFailure;

  constructor(failure: ApiFailure) {
    super(failure.message);
    this.name = 'ApiError';
    this.failure = failure;
  }
}

function baseUrl(): string {
  const url = Config.GATEWAY_URL;
  if (!url) {
    throw new ApiError({
      kind: 'unreachable',
      message: 'GATEWAY_URL is not set. Copy apps/mobile/.env.example to .env and rebuild.',
    });
  }
  return url.replace(/\/+$/, '');
}

async function getJson(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method: 'GET',
      headers: { accept: 'application/json', [API_KEY_HEADER]: Config.API_KEY ?? '' },
      signal: controller.signal,
    });
  } catch (cause) {
    // fetch only rejects when the request never completed: DNS, refused
    // connection, or our own abort. Classification still worked, so this is not
    // a dead end for the user — the caller shows labels without nutrition.
    const aborted = cause instanceof Error && cause.name === 'AbortError';
    throw new ApiError({
      kind: 'unreachable',
      message: aborted
        ? `The gateway did not answer within ${REQUEST_TIMEOUT_MS / 1000}s.`
        : 'Could not reach the gateway.',
    });
  } finally {
    clearTimeout(timeout);
  }

  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (isApiErrorResponse(body)) {
      throw new ApiError({
        kind: 'api',
        code: body.error.code,
        status: response.status,
        message: body.error.message,
      });
    }
    throw new ApiError({
      kind: 'malformed',
      status: response.status,
      message: `Gateway returned ${response.status} with an unrecognised body.`,
    });
  }

  return body;
}

function isNutritionResponse(value: unknown): value is NutritionResponse {
  if (typeof value !== 'object' || value === null) return false;
  const { name, per100g } = value as { name?: unknown; per100g?: unknown };
  if (typeof name !== 'string' || typeof per100g !== 'object' || per100g === null) return false;
  const macros = per100g as Record<string, unknown>;
  return ['kcal', 'protein', 'carbs', 'fat'].every((k) => typeof macros[k] === 'number');
}

/** Looks up nutrition for a classifier label. Throws {@link ApiError} on failure. */
export async function fetchNutrition(food: string): Promise<NutritionResponse> {
  const body = await getJson(nutritionPath(food));
  if (!isNutritionResponse(body)) {
    throw new ApiError({
      kind: 'malformed',
      status: 200,
      message: 'Gateway returned a nutrition body the app does not understand.',
    });
  }
  return body;
}

function isSearchResponse(value: unknown): value is FoodSearchResponse {
  if (typeof value !== 'object' || value === null) return false;
  const { results, total } = value as { results?: unknown; total?: unknown };
  if (!Array.isArray(results) || typeof total !== 'number') return false;
  return results.every((row) => {
    if (typeof row !== 'object' || row === null) return false;
    const { name, per100g } = row as { name?: unknown; per100g?: unknown };
    if (typeof name !== 'string' || typeof per100g !== 'object' || per100g === null) return false;
    const macros = per100g as Record<string, unknown>;
    return ['kcal', 'protein', 'carbs', 'fat'].every((k) => typeof macros[k] === 'number');
  });
}

/**
 * Searches the food database. Throws {@link ApiError} on failure, same as
 * fetchNutrition — the search screen shows the failure inline and stays usable,
 * because manual entry never needed the network.
 */
export async function searchFoods(query: string): Promise<FoodSearchResponse> {
  const body = await getJson(foodSearchPath(query));
  if (!isSearchResponse(body)) {
    throw new ApiError({
      kind: 'malformed',
      status: 200,
      message: 'Gateway returned a search body the app does not understand.',
    });
  }
  return body;
}
