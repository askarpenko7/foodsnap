import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import httpProxy from '@fastify/http-proxy';
import { API_KEY_HEADER, type ApiErrorResponse, type HealthResponse } from '@foodsnap/shared';
import { config, upstreams, type UpstreamConfig } from './config.js';

const SERVICE_NAME = 'gateway';

/** Health must stay reachable without a key so probes don't need a secret. */
const PUBLIC_PATHS = new Set(['/health']);

function errorBody(
  code: ApiErrorResponse['error']['code'],
  message: string,
  requestId: string,
): ApiErrorResponse {
  return { error: { code, message, requestId } };
}

/**
 * An error carrying the exact response to send. Plugins that signal failure by
 * throwing (rate-limit does) route through `setErrorHandler`, which would
 * otherwise flatten them all to 500 and lose both the status and the body.
 */
interface ApiError extends Error {
  statusCode: number;
  apiError: ApiErrorResponse;
}

function apiError(statusCode: number, body: ApiErrorResponse): ApiError {
  return Object.assign(new Error(body.error.message), { statusCode, apiError: body });
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'apiError' in error && 'statusCode' in error;
}

/** Fastify types the error-handler argument loosely, so read the status defensively. */
function statusCodeOf(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const { statusCode } = error as { statusCode: unknown };
    if (typeof statusCode === 'number') return statusCode;
  }
  return 500;
}

function presentedKey(request: FastifyRequest): string | undefined {
  const header = request.headers[API_KEY_HEADER];
  return Array.isArray(header) ? header[0] : header;
}

export interface BuildAppOptions {
  logger?: boolean;
  /** Overrides the routing table; tests point it at a stub or a dead port. */
  upstreams?: UpstreamConfig[];
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const routingTable = options.upstreams ?? upstreams;

  const app = Fastify({
    logger: options.logger === false ? false : { level: config.logLevel },
    // Every request gets an id, echoed into error bodies and forwarded upstream,
    // so one user-reported failure can be followed across both services.
    genReqId: (req) => {
      const header = req.headers['x-request-id'];
      const existing = Array.isArray(header) ? header[0] : header;
      return existing ?? `gw-${crypto.randomUUID()}`;
    },
    requestIdLogLabel: 'requestId',
    trustProxy: true,
  });

  // These must be installed before any `await app.register(...)` below.
  // Awaiting a register loads that plugin immediately, and the child context it
  // creates captures the error handler as it stands at that moment — set them
  // afterwards and the proxied routes silently keep Fastify's default handler,
  // answering with its error shape instead of the shared contract's.
  app.setNotFoundHandler(async (request, reply) => {
    return reply
      .code(404)
      .send(errorBody('NOT_FOUND', `No route for ${request.method} ${request.url}`, request.id));
  });

  app.setErrorHandler(async (error, request, reply) => {
    // Deliberate rejections (rate limit) carry their own status and body.
    if (isApiError(error)) {
      request.log.info({ statusCode: error.statusCode }, 'request rejected');
      return reply.code(error.statusCode).send(error.apiError);
    }

    // Fastify's own client errors — malformed URL, unsupported media type —
    // are the caller's fault and should not be reported as server faults.
    const status = statusCodeOf(error);
    if (status >= 400 && status < 500) {
      request.log.info({ err: error, statusCode: status }, 'bad request');
      const message = error instanceof Error ? error.message : 'Bad request.';
      return reply.code(status).send(errorBody('BAD_REQUEST', message, request.id));
    }

    request.log.error({ err: error }, 'request failed');
    return reply.code(500).send(errorBody('INTERNAL', 'Unexpected error.', request.id));
  });

  await app.register(cors, {
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
    allowedHeaders: ['content-type', API_KEY_HEADER],
  });

  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    // Per key, not per IP: every phone behind one carrier NAT would otherwise
    // share a bucket. Unkeyed requests fall back to IP so an attacker cannot
    // dodge the limit by omitting the header.
    keyGenerator: (request) => presentedKey(request) ?? request.ip,
    allowList: (request) => PUBLIC_PATHS.has(new URL(request.url, 'http://x').pathname),
    // The plugin *throws* this value, so it has to be an Error carrying the
    // status — a plain body would reach the error handler as an unknown fault
    // and go out as 500 with the right headers, which is a confusing 500.
    errorResponseBuilder: (request, context) =>
      apiError(
        context.statusCode,
        errorBody(
          'RATE_LIMITED',
          `Rate limit exceeded: ${context.max} requests per ${context.after}. Retry later.`,
          request.id,
        ),
      ),
  });

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (PUBLIC_PATHS.has(request.routeOptions.url ?? request.url)) return;

    const key = presentedKey(request);
    // A wrong key and a missing key get the same answer on purpose — it tells a
    // prober nothing about which keys exist.
    if (key === undefined || !config.apiKeys.includes(key)) {
      request.log.warn({ hasKey: key !== undefined }, 'rejected unauthenticated request');
      return reply
        .code(401)
        .send(errorBody('UNAUTHORIZED', `Missing or invalid ${API_KEY_HEADER} header.`, request.id));
    }
  });

  app.get('/health', async (): Promise<HealthResponse> => {
    return { status: 'ok', service: SERVICE_NAME, uptime: Math.round(process.uptime()) };
  });

  for (const upstream of routingTable) {
    await app.register(httpProxy, {
      upstream: upstream.target,
      prefix: upstream.prefix,
      rewritePrefix: upstream.rewritePrefix,
      replyOptions: {
        // Without a timeout a stalled upstream would hold the client socket open
        // until something else gave up first.
        timeout: config.upstreamTimeoutMs,
        rewriteRequestHeaders: (request, headers) => {
          // The internal service has no business seeing client credentials.
          const { [API_KEY_HEADER]: _apiKey, ...forwarded } = headers;
          return { ...forwarded, 'x-request-id': String(request.id) };
        },
        onError: (reply, { error }) => {
          reply.log.error({ err: error, upstream: upstream.target }, 'upstream request failed');
          return reply
            .code(502)
            .send(
              errorBody(
                'UPSTREAM_UNAVAILABLE',
                'The nutrition service did not respond. Try again shortly.',
                String(reply.request.id),
              ),
            );
        },
      },
    });
  }

  return app;
}
