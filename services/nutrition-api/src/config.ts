/** Environment configuration, read once at startup so a bad value fails loudly. */

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number, got "${raw}"`);
  }
  return parsed;
}

function floatFromEnv(name: string, fallback: number): number {
  const value = intFromEnv(name, fallback);
  if (value < 0 || value > 1) {
    throw new Error(`${name} must be between 0 and 1, got ${value}`);
  }
  return value;
}

export const config = {
  port: intFromEnv('PORT', 3001),
  // 0.0.0.0 so the container is reachable on the compose network. The service
  // is never published to the host — the gateway is the only public door.
  host: process.env.HOST ?? '0.0.0.0',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  /**
   * Minimum match quality (1 = exact) below which a lookup 404s rather than
   * returning a confidently wrong answer. Tuned in `matcher.test.ts`: high
   * enough to reject "asdfghjkl", low enough to accept "granny smith".
   */
  matchThreshold: floatFromEnv('MATCH_THRESHOLD', 0.45),
} as const;
