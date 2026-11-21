import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let cache = null;

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

async function getCachedInternships() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) return { ...cache.payload, meta: { ...cache.payload.meta, cached: true } };
  const payload = await fetchLiveInternships();
  cache = { timestamp: Date.now(), payload };
  return { ...payload, meta: { ...payload.meta, cached: false } };
}

function sendJson(response, status, payload, extraHeaders = {}) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

function allowedOrigins() {
  return new Set((process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',').map((value) => value.trim()).filter(Boolean));
}

export function createRequestHandler() {
  return async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const origin = request.headers.origin;
    const corsHeaders = {};
    if (origin) {
      if (!allowedOrigins().has(origin)) return sendJson(response, 403, { error: 'Origin not allowed' });
      corsHeaders['access-control-allow-origin'] = origin;
      corsHeaders.vary = 'Origin';
    }

    if (request.method === 'OPTIONS') {
      response.writeHead(204, { ...corsHeaders, 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'Content-Type' });
      return response.end();
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return sendJson(response, 200, { status: 'ok', service: 'internship-board-api' }, corsHeaders);
    }

    if (request.method === 'GET' && url.pathname === '/api/internships') {
      try {
        const payload = await getCachedInternships();
        return sendJson(response, 200, payload, {
          ...corsHeaders,
          'cache-control': 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400',
        });
      } catch (error) {
        console.error('Live internship fetch failed:', error.message);
        return sendJson(response, 503, { error: 'Live internships are temporarily unavailable', retryable: true }, { ...corsHeaders, 'cache-control': 'no-store' });
      }
    }

    return sendJson(response, 404, { error: 'Not found' }, corsHeaders);
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.env.PORT) || 10000;
  const server = http.createServer(createRequestHandler());
  server.listen(port, '0.0.0.0', () => console.log(`Internship Board API listening on ${port}`));
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
