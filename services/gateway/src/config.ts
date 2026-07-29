/**
 * Environment configuration. Anything missing that the gateway cannot safely
 * default is a startup failure — a gateway that silently runs without an API
 * key is worse than one that refuses to boot.
 */

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number, got "${raw}"`);
  }
  return parsed;
}

function requiredApiKeys(): string[] {
  const raw = process.env.API_KEYS ?? process.env.API_KEY ?? '';
  const keys = raw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k !== '');

  if (keys.length === 0) {
    throw new Error(
      'API_KEYS is required — set at least one key (comma-separated for several). ' +
        'See infra/.env.example.',
    );
  }
  return keys;
}

export interface UpstreamConfig {
  /** Public path prefix clients call. */
  prefix: string;
  /** Base URL of the internal service. */
  target: string;
  /** Path prefix on the upstream, if it differs from the public one. */
  rewritePrefix: string;
}

export const config = {
  port: intFromEnv('PORT', 8080),
  host: process.env.HOST ?? '0.0.0.0',
  logLevel: process.env.LOG_LEVEL ?? 'info',

  apiKeys: requiredApiKeys(),

  /** Requests per key per window. The brief's figure: 60/min. */
  rateLimitMax: intFromEnv('RATE_LIMIT_MAX', 60),
  rateLimitWindowMs: intFromEnv('RATE_LIMIT_WINDOW_MS', 60_000),

  /** Upstream must answer within this, or the client gets a 502 rather than a hang. */
  upstreamTimeoutMs: intFromEnv('UPSTREAM_TIMEOUT_MS', 3_000),

  /**
   * Comma-separated allowed origins, or unset to allow any. The mobile client
   * sends no Origin header at all, so this only matters if a web client appears.
   */
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o !== ''),
} as const;

/**
 * Routing table. Adding a second internal service is a new entry here plus its
 * URL in the environment — no new proxy code, which is the whole point of
 * running a gateway rather than letting the app address services directly.
 */
export const upstreams: UpstreamConfig[] = [
  {
    prefix: '/api/v1/nutrition',
    target: process.env.NUTRITION_API_URL ?? 'http://nutrition-api:3001',
    rewritePrefix: '/nutrition',
  },
];
