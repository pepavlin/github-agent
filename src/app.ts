import Fastify from 'fastify';
import type { EnvConfig } from './config/env.js';
import { registerWebhookRoute } from './routes/githubWebhook.js';
import { logger } from './utils/logger.js';

export function buildApp(config: EnvConfig) {
  const app = Fastify({
    logger: false, // We use our own logger
  });

  // Health check
  app.get('/health', async () => ({ status: 'ok' }));

  // Register webhook route
  registerWebhookRoute(app, config);

  app.setErrorHandler((error: Error, _request, reply) => {
    logger.error('Unhandled error', { error: error.message, stack: error.stack });
    reply.status(500).send({ error: 'Internal server error' });
  });

  return app;
}
