import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createDatabase } from './db.js';
import { liveInternshipService } from './live-providers.js';

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.env.PORT) || 10000;
  const db = createDatabase();
  const server = createApp({ db, liveInternships: () => liveInternshipService.fetchLiveInternships() }).listen(port, '0.0.0.0', () => console.log(`Internship Board API listening on ${port}`));
  const shutdown = () => server.close(() => { db.close(); process.exit(0); });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
