import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createDatabase } from './db.js';
import { normalizeGreenhouseResponses } from './provider.js';

export const GREENHOUSE_BOARDS = [
  { token: 'stripe', company: 'Stripe' },
  { token: 'cloudflare', company: 'Cloudflare' },
  { token: 'figma', company: 'Figma' },
  { token: 'datadog', company: 'Datadog' },
  { token: 'mongodb', company: 'MongoDB' },
  { token: 'airbnb', company: 'Airbnb' },
  { token: 'hubspotjobs', company: 'HubSpot' },
];
export async function fetchLiveInternships({ fetchImpl = fetch, now = () => new Date(), boards = GREENHOUSE_BOARDS } = {}) {
  const results = await Promise.all(boards.map(async (board) => {
    try {
      const response = await fetchImpl(`https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs?content=true`, {
        headers: { accept: 'application/json', 'user-agent': 'InternshipBoard/1.0 (+https://github.com/AshwinKirbaa/InternshipBoard)' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return null;
      const payload = await response.json();
      return { board, jobs: payload.jobs };
    } catch {
      return null;
    }
  }));
  const available = results.filter(Boolean);
  const internships = normalizeGreenhouseResponses(available).slice(0, 100);
  if (!internships.length) throw new Error('No live internship openings were found');
  const fetchedAt = now().toISOString();
  return {
    internships,
    meta: {
      source: 'Official Greenhouse job boards',
      sourceUrl: 'https://www.greenhouse.com/',
      fetchedAt,
      count: internships.length,
      live: true,
      boardsChecked: boards.length,
      boardsAvailable: available.length,
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.env.PORT) || 10000;
  const db = createDatabase();
  const server = createApp({ db }).listen(port, '0.0.0.0', () => console.log(`Internship Board API listening on ${port}`));
  const shutdown = () => server.close(() => { db.close(); process.exit(0); });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
