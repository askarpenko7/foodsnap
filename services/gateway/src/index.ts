import { buildApp } from './app.js';
import { config, upstreams } from './config.js';

async function start(): Promise<void> {
  const app = await buildApp();

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      app.log.info({ signal }, 'shutting down');
      app.close().then(
        () => process.exit(0),
        () => process.exit(1),
      );
    });
  }

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(
      {
        upstreams: upstreams.map((u) => `${u.prefix} -> ${u.target}${u.rewritePrefix}`),
        rateLimit: `${config.rateLimitMax}/${config.rateLimitWindowMs}ms per key`,
        apiKeys: config.apiKeys.length,
      },
      'gateway ready',
    );
  } catch (error) {
    app.log.error({ err: error }, 'failed to start');
    process.exit(1);
  }
}

void start();
