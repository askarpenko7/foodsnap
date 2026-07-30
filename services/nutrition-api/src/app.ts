import Fastify, { type FastifyInstance } from 'fastify';
import type {
  ApiErrorResponse,
  FoodSearchResponse,
  HealthResponse,
  NutritionResponse,
} from '@foodsnap/shared';
import { config } from './config.js';
import { foods } from './foods.js';
import { createMatcher, type Matcher } from './matcher.js';

const SERVICE_NAME = 'nutrition-api';

/** Enough rows to fill the search list without scrolling forever. */
const DEFAULT_SEARCH_LIMIT = 10;
/** A caller asking for more than this is not rendering a search box. */
const MAX_SEARCH_LIMIT = 50;

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
    // user's report can be traced across both services. Logged as `reqId`,
    // Fastify's default — renaming it now needs a custom logController class,
    // which is not worth a field name.
    requestIdHeader: 'x-request-id',
  });

  app.get('/health', async (): Promise<HealthResponse> => {
    return { status: 'ok', service: SERVICE_NAME, uptime: Math.round(process.uptime()) };
  });

  /**
   * Search stays server-side rather than shipping foods.json into the app: the
   * database is the service's business, it can grow without an app release, and
   * the gateway keeps owning auth and rate limiting for it like everything else.
   */
  app.get<{ Querystring: { q?: string; limit?: string } }>('/foods', async (request, reply) => {
    const query = request.query.q ?? '';
    const requested = Number(request.query.limit ?? DEFAULT_SEARCH_LIMIT);
    const limit = Number.isFinite(requested)
      ? Math.min(Math.max(Math.trunc(requested), 1), MAX_SEARCH_LIMIT)
      : DEFAULT_SEARCH_LIMIT;

    const body: FoodSearchResponse = {
      query,
      results: matcher.search(query, limit).map(({ food }) => ({
        name: food.name,
        per100g: food.per100g,
        ...(food.servings === undefined ? {} : { servings: food.servings }),
      })),
      total: foods.length,
    };
    // An empty query or no matches is an empty list, not a 404 — the caller is a
    // search box, and "nothing yet" is its normal state.
    return reply.send(body);
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
    // Omitted rather than sent as [] when the food has no natural unit, so the
    // client can tell "no presets" from "presets not loaded".
    if (result.food.servings !== undefined) body.servings = result.food.servings;
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
