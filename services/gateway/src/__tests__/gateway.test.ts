import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';
import { API_KEY_HEADER, type ApiErrorResponse } from '@foodsnap/shared';

/**
 * The gateway reads its configuration at import time and refuses to start
 * without an API key, so the environment has to be set before `app.js` loads —
 * hence the dynamic import below.
 */
const VALID_KEY = 'test-key';
const RATE_LIMIT_MAX = 3;

process.env.API_KEYS = `${VALID_KEY},other-key`;
process.env.RATE_LIMIT_MAX = String(RATE_LIMIT_MAX);
process.env.UPSTREAM_TIMEOUT_MS = '500';

const { buildApp } = await import('../app.js');

/** Stands in for nutrition-api so these tests never touch the real service. */
async function startStubUpstream(): Promise<{ url: string; close: () => Promise<void> }> {
  const upstream = Fastify({ logger: false });

  upstream.get('/nutrition/:food', async (request, reply) => {
    const { food } = request.params as { food: string };
    if (food === 'unknown') {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'no match' } });
    }
    return reply.send({
      name: food,
      per100g: { kcal: 266, protein: 11, carbs: 33, fat: 10 },
      match: { query: food, matchedOn: food, score: 1 },
      // Echoed back so a test can assert what the gateway forwarded.
      seenHeaders: {
        apiKey: request.headers[API_KEY_HEADER] ?? null,
        requestId: request.headers['x-request-id'] ?? null,
      },
    });
  });

  await upstream.listen({ port: 0, host: '127.0.0.1' });
  const address = upstream.server.address();
  if (address === null || typeof address === 'string') throw new Error('no port assigned');

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => upstream.close(),
  };
}

describe('gateway', () => {
  let stub: Awaited<ReturnType<typeof startStubUpstream>>;
  let app: FastifyInstance;

  beforeAll(async () => {
    stub = await startStubUpstream();
  });

  afterAll(async () => {
    await stub.close();
  });

  afterEach(async () => {
    await app?.close();
  });

  async function buildAgainstStub(target = stub.url): Promise<FastifyInstance> {
    app = await buildApp({
      logger: false,
      upstreams: [
        { prefix: '/api/v1/nutrition', target, rewritePrefix: '/nutrition' },
      ],
    });
    await app.ready();
    return app;
  }

  describe('health', () => {
    it('is reachable without a key, so probes need no secret', async () => {
      const response = await (await buildAgainstStub()).inject({ url: '/health' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ status: 'ok', service: 'gateway' });
    });
  });

  describe('authentication', () => {
    it('rejects a request with no key', async () => {
      const response = await (await buildAgainstStub()).inject({ url: '/api/v1/nutrition/pizza' });
      expect(response.statusCode).toBe(401);
      expect(response.json<ApiErrorResponse>().error.code).toBe('UNAUTHORIZED');
    });

    it('rejects a wrong key with an identical response, revealing nothing', async () => {
      const gateway = await buildAgainstStub();
      const missing = await gateway.inject({ url: '/api/v1/nutrition/pizza' });
      const wrong = await gateway.inject({
        url: '/api/v1/nutrition/pizza',
        headers: { [API_KEY_HEADER]: 'nope' },
      });

      expect(wrong.statusCode).toBe(401);
      expect(wrong.json<ApiErrorResponse>().error.message).toBe(
        missing.json<ApiErrorResponse>().error.message,
      );
    });

    it('accepts every configured key', async () => {
      const gateway = await buildAgainstStub();
      for (const key of [VALID_KEY, 'other-key']) {
        const response = await gateway.inject({
          url: '/api/v1/nutrition/pizza',
          headers: { [API_KEY_HEADER]: key },
        });
        expect(response.statusCode).toBe(200);
      }
    });
  });

  describe('proxying', () => {
    it('forwards to the upstream and returns its body', async () => {
      const response = await (await buildAgainstStub()).inject({
        url: '/api/v1/nutrition/pizza',
        headers: { [API_KEY_HEADER]: VALID_KEY },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ name: 'pizza', per100g: { kcal: 266 } });
    });

    it('strips the api key and forwards a request id', async () => {
      const response = await (await buildAgainstStub()).inject({
        url: '/api/v1/nutrition/pizza',
        headers: { [API_KEY_HEADER]: VALID_KEY },
      });

      const { seenHeaders } = response.json<{
        seenHeaders: { apiKey: string | null; requestId: string | null };
      }>();
      expect(seenHeaders.apiKey).toBeNull();
      expect(seenHeaders.requestId).toBeTruthy();
    });

    it('passes an upstream 404 through unchanged', async () => {
      const response = await (await buildAgainstStub()).inject({
        url: '/api/v1/nutrition/unknown',
        headers: { [API_KEY_HEADER]: VALID_KEY },
      });
      expect(response.statusCode).toBe(404);
      expect(response.json<ApiErrorResponse>().error.code).toBe('NOT_FOUND');
    });

    it('maps an unreachable upstream to 502 rather than hanging', async () => {
      // Port 1 is reserved and nothing listens there.
      const response = await (await buildAgainstStub('http://127.0.0.1:1')).inject({
        url: '/api/v1/nutrition/pizza',
        headers: { [API_KEY_HEADER]: VALID_KEY },
      });
      expect(response.statusCode).toBe(502);
      expect(response.json<ApiErrorResponse>().error.code).toBe('UPSTREAM_UNAVAILABLE');
    });

    it('404s an unknown route in the shared error shape', async () => {
      const response = await (await buildAgainstStub()).inject({
        url: '/api/v1/nothing-here',
        headers: { [API_KEY_HEADER]: VALID_KEY },
      });
      expect(response.statusCode).toBe(404);
      expect(response.json<ApiErrorResponse>().error.code).toBe('NOT_FOUND');
    });
  });

  describe('rate limiting', () => {
    it(`allows ${RATE_LIMIT_MAX} requests then answers 429 in the shared shape`, async () => {
      const gateway = await buildAgainstStub();
      const headers = { [API_KEY_HEADER]: VALID_KEY };

      for (let i = 0; i < RATE_LIMIT_MAX; i++) {
        const allowed = await gateway.inject({ url: '/api/v1/nutrition/pizza', headers });
        expect(allowed.statusCode).toBe(200);
      }

      const limited = await gateway.inject({ url: '/api/v1/nutrition/pizza', headers });
      // Regression guard: the plugin throws its error body, so without an Error
      // carrying statusCode this came back as a 500.
      expect(limited.statusCode).toBe(429);
      expect(limited.json<ApiErrorResponse>().error.code).toBe('RATE_LIMITED');
      expect(limited.headers['retry-after']).toBeDefined();
    });

    it('buckets per key, so one noisy client cannot lock another out', async () => {
      const gateway = await buildAgainstStub();

      for (let i = 0; i < RATE_LIMIT_MAX + 1; i++) {
        await gateway.inject({
          url: '/api/v1/nutrition/pizza',
          headers: { [API_KEY_HEADER]: VALID_KEY },
        });
      }

      const otherKey = await gateway.inject({
        url: '/api/v1/nutrition/pizza',
        headers: { [API_KEY_HEADER]: 'other-key' },
      });
      expect(otherKey.statusCode).toBe(200);
    });

    it('does not rate limit health probes', async () => {
      const gateway = await buildAgainstStub();
      for (let i = 0; i < RATE_LIMIT_MAX + 3; i++) {
        const response = await gateway.inject({ url: '/health' });
        expect(response.statusCode).toBe(200);
      }
    });
  });
});
