import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import type {
  ApiErrorResponse,
  FoodSearchResponse,
  NutritionResponse,
} from '@foodsnap/shared';
import { buildApp } from '../app.js';

/** Driven through inject(), so no port is bound and the tests stay hermetic. */
describe('nutrition-api routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok', service: 'nutrition-api' });
  });

  it('GET /nutrition/:food returns macros and how it matched', async () => {
    const response = await app.inject({ method: 'GET', url: '/nutrition/pizza' });
    expect(response.statusCode).toBe(200);

    const body = response.json<NutritionResponse>();
    expect(body.name).toBe('Pizza');
    expect(body.per100g.kcal).toBeGreaterThan(0);
    expect(body.match).toMatchObject({ query: 'pizza', matchedOn: 'pizza', score: 1 });
  });

  it('resolves a URL-encoded multi-word label', async () => {
    const response = await app.inject({ method: 'GET', url: '/nutrition/hot%20dog' });
    expect(response.statusCode).toBe(200);
    expect(response.json<NutritionResponse>().name).toBe('Hot dog');
  });

  it('returns portion presets for a food that has them', async () => {
    const response = await app.inject({ method: 'GET', url: '/nutrition/pizza' });
    const { servings } = response.json<NutritionResponse>();

    // The concept's own chips for pizza.
    expect(servings).toEqual([
      { label: '1 slice', grams: 128 },
      { label: '2 slices', grams: 256 },
      { label: 'whole', grams: 768 },
    ]);
  });

  it('omits servings entirely for a food with no natural unit', async () => {
    // Spinach is weighed, not counted — there is no "1 spinach".
    const response = await app.inject({ method: 'GET', url: '/nutrition/spinach' });
    expect(response.json<NutritionResponse>().servings).toBeUndefined();
  });

  describe('GET /foods', () => {
    it('returns matches for a partial query, best first', async () => {
      const response = await app.inject({ method: 'GET', url: '/foods?q=piz' });
      expect(response.statusCode).toBe(200);

      const body = response.json<FoodSearchResponse>();
      expect(body.query).toBe('piz');
      expect(body.total).toBeGreaterThanOrEqual(120);
      expect(body.results[0]?.name).toBe('Pizza');
      // Every row carries what the list needs to render a kcal/100 g line.
      expect(body.results[0]?.per100g.kcal).toBeGreaterThan(0);
    });

    it('lists a food once even when several of its aliases match', async () => {
      const { results } = (
        await app.inject({ method: 'GET', url: '/foods?q=pizza' })
      ).json<FoodSearchResponse>();
      const names = results.map((r) => r.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('carries servings through so the portion editor gets its presets', async () => {
      const { results } = (
        await app.inject({ method: 'GET', url: '/foods?q=pizza' })
      ).json<FoodSearchResponse>();
      expect(results.find((r) => r.name === 'Pizza')?.servings?.[0]).toEqual({
        label: '1 slice',
        grams: 128,
      });
    });

    // A search box's normal state, not an error.
    it('answers an empty query with an empty list, not a 404', async () => {
      const response = await app.inject({ method: 'GET', url: '/foods?q=' });
      expect(response.statusCode).toBe(200);
      expect(response.json<FoodSearchResponse>().results).toEqual([]);
    });

    it('answers gibberish with an empty list', async () => {
      const { results } = (
        await app.inject({ method: 'GET', url: '/foods?q=asdfghjkl' })
      ).json<FoodSearchResponse>();
      expect(results).toEqual([]);
    });

    it('honours limit and caps it', async () => {
      const three = (
        await app.inject({ method: 'GET', url: '/foods?q=a&limit=3' })
      ).json<FoodSearchResponse>();
      expect(three.results.length).toBeLessThanOrEqual(3);

      const capped = (
        await app.inject({ method: 'GET', url: '/foods?q=a&limit=9999' })
      ).json<FoodSearchResponse>();
      expect(capped.results.length).toBeLessThanOrEqual(50);
    });
  });

  it('404s with the shared error shape when nothing matches', async () => {
    const response = await app.inject({ method: 'GET', url: '/nutrition/asdfghjkl' });
    expect(response.statusCode).toBe(404);

    const body = response.json<ApiErrorResponse>();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('asdfghjkl');
    expect(body.error.requestId).toBeTruthy();
  });

  it('404s in the same shape for an unknown route', async () => {
    const response = await app.inject({ method: 'GET', url: '/nope' });
    expect(response.statusCode).toBe(404);
    expect(response.json<ApiErrorResponse>().error.code).toBe('NOT_FOUND');
  });

  it('rounds the reported score so responses stay stable', async () => {
    const response = await app.inject({ method: 'GET', url: '/nutrition/spagetti' });
    const { match } = response.json<NutritionResponse>();
    expect(match.score).toBeLessThan(1);
    expect(String(match.score).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(3);
  });

  it('accepts an injected matcher, so route behaviour can be tested in isolation', async () => {
    const stub = buildApp({
      logger: false,
      matcher: { match: () => null, search: () => [] },
    });
    await stub.ready();
    const response = await stub.inject({ method: 'GET', url: '/nutrition/pizza' });
    expect(response.statusCode).toBe(404);
    await stub.close();
  });
});
