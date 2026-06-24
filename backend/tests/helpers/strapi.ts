// Boots a single Strapi instance for integration tests against an isolated
// SQLite database so the developer's real data is never touched.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_CLIENT = 'sqlite';
process.env.DATABASE_FILENAME = '.tmp/test.db';
// Disable scheduled jobs during tests (avoids noise and lingering timers).
process.env.CRON_ENABLED = 'false';

import fs from 'fs';
import path from 'path';

let instance: any;

export async function setupStrapi() {
  if (!instance) {
    // Lazy require so the env vars above are set before Strapi reads config.
    const { createStrapi, compileStrapi } = require('@strapi/strapi');
    const appContext = await compileStrapi();
    instance = await createStrapi(appContext).load();
    await instance.server.mount();
  }
  return instance;
}

export async function cleanupStrapi() {
  if (!instance) return;

  const server = instance.server.httpServer;
  const connection = instance.db.connection;

  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (connection) {
    await connection.destroy();
  }

  // Remove the throwaway test database file.
  const dbFile = path.join(__dirname, '..', '..', '.tmp', 'test.db');
  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
  }

  instance = undefined;
}
