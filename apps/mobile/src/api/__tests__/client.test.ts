import { API_KEY_HEADER } from '@foodsnap/shared';
import { ApiError, fetchNutrition } from '../client';

/**
 * The client's job is to turn every possible reply into one of a few outcomes
 * the UI can render, so these tests drive `fetch` rather than a real gateway.
 */

const NUTRITION = {
  name: 'Pizza',
  per100g: { kcal: 266, protein: 11, carbs: 33, fat: 10 },
  match: { query: 'pizza', matchedOn: 'pizza', score: 1 },
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

describe('fetchNutrition request building', () => {
  it('calls the versioned gateway path with the api key header', async () => {
    mockFetch.mockResolvedValue(jsonResponse(NUTRITION));
    await fetchNutrition('pizza');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://gateway.test/api/v1/nutrition/pizza');
    expect((init.headers as Record<string, string>)[API_KEY_HEADER]).toBe('test-key');
  });

  it('encodes labels containing spaces or punctuation', async () => {
    mockFetch.mockResolvedValue(jsonResponse(NUTRITION));
    await fetchNutrition('hot dog');
    expect(mockFetch.mock.calls[0]?.[0]).toBe('http://gateway.test/api/v1/nutrition/hot%20dog');

    await fetchNutrition('Pizza, pepperoni');
    expect(mockFetch.mock.calls[1]?.[0]).toBe(
      'http://gateway.test/api/v1/nutrition/Pizza%2C%20pepperoni',
    );
  });

  it('returns the parsed body on success', async () => {
    mockFetch.mockResolvedValue(jsonResponse(NUTRITION));
    await expect(fetchNutrition('pizza')).resolves.toMatchObject({
      name: 'Pizza',
      per100g: { kcal: 266 },
    });
  });
});

describe('fetchNutrition failure classification', () => {
  it('maps a structured 404 to an api failure carrying the code', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'no match' } }, 404),
    );

    await expect(fetchNutrition('asdf')).rejects.toBeInstanceOf(ApiError);
    // The UI shows "not in the database" for this, not an error state.
    await fetchNutrition('asdf').catch((error: ApiError) => {
      expect(error.failure).toMatchObject({ kind: 'api', code: 'NOT_FOUND', status: 404 });
    });
  });

  it('maps a rejected 401 to an api failure', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'bad key' } }, 401),
    );
    await fetchNutrition('pizza').catch((error: ApiError) => {
      expect(error.failure).toMatchObject({ kind: 'api', code: 'UNAUTHORIZED' });
    });
  });

  it('reports an unreachable gateway rather than crashing', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    await fetchNutrition('pizza').catch((error: ApiError) => {
      expect(error.failure.kind).toBe('unreachable');
    });
  });

  it('treats an aborted request as unreachable, mentioning the timeout', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    mockFetch.mockRejectedValue(abort);

    await fetchNutrition('pizza').catch((error: ApiError) => {
      expect(error.failure.kind).toBe('unreachable');
      expect(error.failure.message).toMatch(/did not answer/);
    });
  });

  it('flags an error body that is not the shared shape as malformed', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ oops: true }, 500));
    await fetchNutrition('pizza').catch((error: ApiError) => {
      expect(error.failure).toMatchObject({ kind: 'malformed', status: 500 });
    });
  });

  it('rejects a 200 whose body is not nutrition, instead of rendering undefined', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ name: 'Pizza' }));
    await fetchNutrition('pizza').catch((error: ApiError) => {
      expect(error.failure.kind).toBe('malformed');
    });
  });

  it('rejects a 200 whose macros are not numbers', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ name: 'Pizza', per100g: { kcal: '266', protein: 11, carbs: 33, fat: 10 } }),
    );
    await fetchNutrition('pizza').catch((error: ApiError) => {
      expect(error.failure.kind).toBe('malformed');
    });
  });
});
