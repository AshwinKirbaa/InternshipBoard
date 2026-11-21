import { normalizeAshbyJob, normalizeGreenhouseJob, normalizeLeverJob } from './provider.js';

export const LIVE_SOURCES = [
  { provider: 'greenhouse', token: 'stripe', company: 'Stripe' },
  { provider: 'greenhouse', token: 'cloudflare', company: 'Cloudflare' },
  { provider: 'greenhouse', token: 'figma', company: 'Figma' },
  { provider: 'greenhouse', token: 'datadog', company: 'Datadog' },
  { provider: 'greenhouse', token: 'mongodb', company: 'MongoDB' },
  { provider: 'greenhouse', token: 'airbnb', company: 'Airbnb' },
  { provider: 'greenhouse', token: 'hubspotjobs', company: 'HubSpot' },
  { provider: 'lever', token: 'palantir', company: 'Palantir' },
  { provider: 'lever', token: 'anduril', company: 'Anduril' },
  { provider: 'lever', token: 'spotify', company: 'Spotify' },
  { provider: 'ashby', token: 'openai', company: 'OpenAI' },
  { provider: 'ashby', token: 'ramp', company: 'Ramp' },
  { provider: 'ashby', token: 'linear', company: 'Linear' },
];

const PROVIDERS = {
  greenhouse: {
    name: 'Greenhouse',
    url: ({ token }) => `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`,
    jobs: (payload) => payload?.jobs,
    normalize: normalizeGreenhouseJob,
  },
  lever: {
    name: 'Lever',
    url: ({ token }) => `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`,
    jobs: (payload) => payload,
    normalize: normalizeLeverJob,
  },
  ashby: {
    name: 'Ashby',
    url: ({ token }) => `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}`,
    jobs: (payload) => payload?.jobs,
    normalize: normalizeAshbyJob,
  },
};

async function fetchSource(source, fetchImpl) {
  const provider = PROVIDERS[source.provider];
  if (!provider) throw new Error(`Unsupported live provider: ${source.provider}`);
  const response = await fetchImpl(provider.url(source), {
    headers: { accept: 'application/json', 'user-agent': 'InternshipBoard/1.0 (+https://github.com/AshwinKirbaa/InternshipBoard)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`${provider.name} returned HTTP ${response.status}`);
  const jobs = provider.jobs(await response.json());
  if (!Array.isArray(jobs)) throw new Error(`${provider.name} returned an invalid payload`);
  return { provider: provider.name, records: jobs.map((job) => provider.normalize(job, source)).filter(Boolean) };
}

export function createLiveInternshipService({ fetchImpl = fetch, sources = LIVE_SOURCES, now = () => new Date(), cacheTtlMs = 15 * 60_000 } = {}) {
  let cached = null;
  let expiresAt = 0;
  let inFlight = null;

  const refresh = async () => {
    const settled = await Promise.allSettled(sources.map((source) => fetchSource(source, fetchImpl)));
    const available = settled.filter(({ status }) => status === 'fulfilled').map(({ value }) => value);
    const seen = new Set();
    const internships = available.flatMap(({ records }) => records).filter((record) => {
      const url = new URL(record.sourceUrl);
      url.hash = '';
      const key = url.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 200);
    if (!internships.length) throw new Error('No live internship openings were found');
    const providers = [...new Set(available.filter(({ records }) => records.length).map(({ provider }) => provider))];
    const completedAt = now();
    cached = {
      internships,
      meta: {
        source: 'Official employer job boards', live: true, fetchedAt: completedAt.toISOString(), count: internships.length,
        sourcesChecked: sources.length, sourcesAvailable: available.length, providers,
      },
    };
    expiresAt = completedAt.getTime() + cacheTtlMs;
    return cached;
  };

  return {
    fetchLiveInternships() {
      const currentTime = now().getTime();
      if (cached && currentTime < expiresAt) return Promise.resolve(cached);
      if (!inFlight) inFlight = refresh().finally(() => { inFlight = null; });
      return inFlight;
    },
  };
}

export const liveInternshipService = createLiveInternshipService();
