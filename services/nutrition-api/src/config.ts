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
   * returning a confidently wrong answer.
   *
   * 0.7 is measured, not guessed. Real misspellings score 0.83–1.00
   * ("banna"→Banana 0.833 is the worst observed), while the junk that
   * classifiers actually emit — "outdoor", "sky", "moon", "utensil" — all fall
   * below 0.7 against every one of the ~470 keys. That leaves a wide dead band
   * in between, which is where a threshold wants to sit.
   */
  matchThreshold: floatFromEnv('MATCH_THRESHOLD', 0.7),
} as const;
