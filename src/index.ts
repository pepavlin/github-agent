import { loadConfig } from './config/env.js';
import { buildApp } from './app.js';
import { getDb, closeDb } from './db/sqlite.js';
import { logger } from './utils/logger.js';

async function main() {
  const config = loadConfig();

  // Initialize database (runs migrations)
  getDb();
  logger.info('Database initialized');

  const app = buildApp(config);

  const shutdown = async () => {
    logger.info('Shutting down...');
    await app.close();
    closeDb();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection', { error: String(err) });
  });

  await app.listen({ port: config.port, host: '0.0.0.0' });
  logger.info(`Server listening on port ${config.port}`);
}

main().catch((err) => {
  logger.error('Fatal startup error', { error: String(err) });
  process.exit(1);
});
