import Fastify, { type FastifyInstance } from 'fastify';
import type { ApiErrorResponse, HealthResponse, NutritionResponse } from '@foodsnap/shared';
import { config } from './config.js';
import { foods } from './foods.js';
import { createMatcher, type Matcher } from './matcher.js';

const SERVICE_NAME = 'nutrition-api';

export interface BuildAppOptions {
  /** Injectable for tests; defaults to a matcher over the bundled database. */
  matcher?: Matcher;
  logger?: boolean;
}

/**
 * Builds the service without binding a port, so tests drive it through
 * `app.inject()` instead of real sockets. `index.ts` owns listening.
 */
export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const matcher = options.matcher ?? createMatcher(foods, config.matchThreshold);

  const app = Fastify({
    logger: options.logger === false ? false : { level: config.logLevel },
    // The gateway stamps every request with an id; reuse it so one line of a
    // user's report can be traced across both services.
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  app.get('/health', async (): Promise<HealthResponse> => {
    return { status: 'ok', service: SERVICE_NAME, uptime: Math.round(process.uptime()) };
  });

  app.get<{ Params: { food: string } }>('/nutrition/:food', async (request, reply) => {
    const { food: query } = request.params;
    const result = matcher.match(query);

    if (!result) {
      const body: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `No food in the database matches "${query}" closely enough.`,
          requestId: request.id,
        },
      };
      return reply.code(404).send(body);
    }

    const body: NutritionResponse = {
      name: result.food.name,
      per100g: result.food.per100g,
      match: { query, matchedOn: result.matchedOn, score: Number(result.score.toFixed(3)) },
    };
    return reply.send(body);
  });

  app.setNotFoundHandler(async (request, reply) => {
    const body: ApiErrorResponse = {
      error: {
        code: 'NOT_FOUND',
        message: `No route for ${request.method} ${request.url}`,
        requestId: request.id,
      },
    };
    return reply.code(404).send(body);
  });

  app.setErrorHandler(async (error, request, reply) => {
    request.log.error({ err: error }, 'request failed');
    const body: ApiErrorResponse = {
      error: { code: 'INTERNAL', message: 'Unexpected error.', requestId: request.id },
    };
    return reply.code(500).send(body);
  });

  return app;
}
