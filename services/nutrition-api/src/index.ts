import { buildApp } from './app.js';
import { config } from './config.js';
import { foods } from './foods.js';

const app = buildApp();

async function start(): Promise<void> {
  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info({ foods: foods.length, matchThreshold: config.matchThreshold }, 'database loaded');
  } catch (error) {
    app.log.error({ err: error }, 'failed to start');
    process.exit(1);
  }
}

// Containers stop with SIGTERM; close in-flight requests before exiting so
// compose and Cloud Run see a clean shutdown rather than a killed process.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    app.log.info({ signal }, 'shutting down');
    app.close().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
}

void start();
