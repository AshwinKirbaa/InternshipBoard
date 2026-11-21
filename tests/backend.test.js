import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractSkills,
  isInternshipOpening,
  normalizeAshbyJob,
  normalizeGreenhouseJob,
  normalizeGreenhouseResponses,
  normalizeLeverJob,
} from '../backend/provider.js';
import { createLiveInternshipService } from '../backend/live-providers.js';

const liveJob = {
  id: 901,
  absolute_url: 'https://job-boards.greenhouse.io/example/jobs/901',
  title: 'Frontend Engineering Intern',
  location: { name: 'Bengaluru, India' },
  updated_at: '2026-11-20T10:00:00Z',
  content: '<p>Build accessible web interfaces with JavaScript, CSS, React, and Git.</p>',
  departments: [{ name: 'Engineering' }],
};

test('recognizes internship-like openings but rejects internal and senior roles', () => {
  assert.equal(isInternshipOpening(liveJob), true);
  assert.equal(isInternshipOpening({ title: 'Graduate Software Trainee' }), true);
  assert.equal(isInternshipOpening({ title: 'Internal Audit Manager' }), false);
  assert.equal(isInternshipOpening({ title: 'Senior Software Engineer' }), false);
});

test('extracts a bounded set of recognizable skills from published content', () => {
  assert.deepEqual(extractSkills(`${liveJob.title} ${liveJob.content}`), ['JavaScript', 'React', 'CSS', 'Git']);
});

test('normalizes a Greenhouse job into the live board schema', () => {
  const record = normalizeGreenhouseJob(liveJob, { token: 'example', company: 'Example Labs' });
  assert.deepEqual(record, {
    id: 'greenhouse-example-901',
    title: 'Frontend Engineering Intern',
    company: 'Example Labs',
    domain: 'Engineering',
    mode: 'On-site',
    location: 'Bengaluru, India',
    skills: ['JavaScript', 'React', 'CSS', 'Git'],
    openings: 1,
    salary: '',
    description: 'Build accessible web interfaces with JavaScript, CSS, React, and Git.',
    publishedAt: '2026-11-20T10:00:00.000Z',
    source: 'Greenhouse',
    sourceUrl: liveJob.absolute_url,
    isLive: true,
  });
});

test('drops malformed, unsafe, unrelated, and duplicate jobs across boards', () => {
  const result = normalizeGreenhouseResponses([
    { board: { token: 'example', company: 'Example Labs' }, jobs: [liveJob, { ...liveJob }] },
    { board: { token: 'other', company: 'Other' }, jobs: [{ ...liveJob, id: 902, title: 'Senior Engineer' }] },
    { board: { token: 'unsafe', company: 'Unsafe' }, jobs: [{ ...liveJob, id: 903, absolute_url: 'javascript:alert(1)' }] },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'greenhouse-example-901');
});

test('normalizes Lever and Ashby jobs without changing the internship record shape', () => {
  const lever = normalizeLeverJob({
    id: 'lever-1', text: 'Software Engineer Intern', hostedUrl: 'https://jobs.lever.co/example/lever-1',
    categories: { team: 'Engineering', location: 'Remote - India', commitment: 'Intern' },
    descriptionPlain: 'Build web products with TypeScript and React.', createdAt: 1795161600000,
  }, { token: 'example', company: 'Example Labs' });
  const ashby = normalizeAshbyJob({
    id: 'ashby-1', title: 'Data Science Intern', jobUrl: 'https://jobs.ashbyhq.com/example/ashby-1',
    location: 'Bengaluru', department: 'Data', descriptionPlain: 'Use Python, SQL, and machine learning.',
    publishedAt: '2026-11-20T08:00:00Z', isRemote: false,
  }, { token: 'example', company: 'Example Labs' });

  assert.deepEqual(Object.keys(lever).sort(), Object.keys(ashby).sort());
  assert.equal(lever.source, 'Lever');
  assert.equal(lever.mode, 'Remote');
  assert.deepEqual(lever.skills, ['TypeScript', 'React']);
  assert.equal(ashby.source, 'Ashby');
  assert.deepEqual(ashby.skills, ['Python', 'SQL', 'Machine Learning']);
});

test('honors provider workplace and internship classifications and excludes unlisted Ashby jobs', () => {
  const lever = normalizeLeverJob({
    id: 'lever-hybrid', text: 'Software Engineer, Summer 2027', hostedUrl: 'https://jobs.lever.co/example/hybrid',
    workplaceType: 'hybrid', categories: { team: 'Engineering', location: 'Pune', commitment: 'Internship' },
    descriptionPlain: 'Build products.', createdAt: 1795161600000,
  }, { token: 'example', company: 'Example Labs' });
  const ashby = normalizeAshbyJob({
    id: 'ashby-hybrid', title: 'Software Engineer, Summer 2027', jobUrl: 'https://jobs.ashbyhq.com/example/hybrid',
    location: 'Bengaluru', department: 'Engineering', descriptionPlain: 'Build products.',
    publishedAt: '2026-11-20T08:00:00Z', workplaceType: 'Hybrid', employmentType: 'Intern', isRemote: true, isListed: true,
  }, { token: 'example', company: 'Example Labs' });
  const unlisted = normalizeAshbyJob({
    id: 'ashby-hidden', title: 'Engineering Intern', jobUrl: 'https://jobs.ashbyhq.com/example/hidden',
    employmentType: 'Intern', isListed: false,
  }, { token: 'example', company: 'Example Labs' });

  assert.equal(lever.mode, 'Hybrid');
  assert.equal(ashby.mode, 'Hybrid');
  assert.equal(unlisted, null);
});

test('aggregates every official provider, tolerates partial failure, and removes duplicate URLs', async () => {
  const sources = [
    { provider: 'greenhouse', token: 'green', company: 'Green Co' },
    { provider: 'lever', token: 'lever', company: 'Lever Co' },
    { provider: 'ashby', token: 'broken', company: 'Broken Co' },
  ];
  const fetchImpl = async (url) => {
    if (url.includes('/broken/')) return { ok: false, status: 503 };
    if (url.includes('greenhouse')) return { ok: true, json: async () => ({ jobs: [liveJob] }) };
    return { ok: true, json: async () => ([{
      id: 'lever-1', text: 'Frontend Engineering Intern', hostedUrl: liveJob.absolute_url,
      categories: { team: 'Engineering', location: 'Remote' }, descriptionPlain: 'React', createdAt: 1795161600000,
    }, {
      id: 'lever-2', text: 'Backend Intern', hostedUrl: 'https://jobs.lever.co/lever/lever-2',
      categories: { team: 'Engineering', location: 'Pune' }, descriptionPlain: 'Node.js and SQL', createdAt: 1795161700000,
    }]) };
  };
  const service = createLiveInternshipService({ fetchImpl, sources, now: () => new Date('2026-11-21T00:00:00Z') });
  const result = await service.fetchLiveInternships();

  assert.equal(result.internships.length, 2);
  assert.deepEqual(new Set(result.internships.map(({ source }) => source)), new Set(['Greenhouse', 'Lever']));
  assert.equal(result.meta.sourcesChecked, 3);
  assert.equal(result.meta.sourcesAvailable, 2);
  assert.deepEqual(result.meta.providers, ['Greenhouse', 'Lever']);
});

test('isolates malformed payloads and rejects only when every source is unusable', async () => {
  const sources = [{ provider: 'lever', token: 'empty', company: 'Empty' }];
  const malformed = createLiveInternshipService({ sources, fetchImpl: async () => ({ ok: true, json: async () => ({ jobs: 'wrong' }) }) });
  await assert.rejects(() => malformed.fetchLiveInternships(), /no live internship openings/i);

  const failed = createLiveInternshipService({ sources, fetchImpl: async () => ({ ok: false, status: 503 }) });
  await assert.rejects(() => failed.fetchLiveInternships(), /no live internship openings/i);
});

test('isolates a malformed record URL while preserving healthy provider results', async () => {
  const sources = [
    { provider: 'greenhouse', token: 'malformed', company: 'Malformed' },
    { provider: 'greenhouse', token: 'healthy', company: 'Healthy' },
  ];
  const service = createLiveInternshipService({ sources, fetchImpl: async (url) => ({
    ok: true,
    json: async () => ({ jobs: url.includes('/malformed/')
      ? [{ ...liveJob, id: 1, absolute_url: ['https://example.com/jobs/array'] }]
      : [{ ...liveJob, id: 2, absolute_url: 'https://example.com/jobs/healthy' }] }),
  }) });

  const result = await service.fetchLiveInternships();
  assert.deepEqual(result.internships.map(({ sourceUrl }) => sourceUrl), ['https://example.com/jobs/healthy']);
});

test('deduplicates URL fragments without folding case-sensitive paths', async () => {
  const service = createLiveInternshipService({
    sources: [{ provider: 'greenhouse', token: 'example', company: 'Example' }],
    fetchImpl: async () => ({ ok: true, json: async () => ({ jobs: [
      { ...liveJob, id: 1, absolute_url: 'https://example.com/roles/RoleA' },
      { ...liveJob, id: 2, absolute_url: 'https://example.com/roles/rolea' },
      { ...liveJob, id: 3, absolute_url: 'https://example.com/roles/RoleA#apply' },
    ] }) }),
  });
  const result = await service.fetchLiveInternships();
  assert.deepEqual(result.internships.map(({ sourceUrl }) => sourceUrl), [
    'https://example.com/roles/RoleA',
    'https://example.com/roles/rolea',
  ]);
});

test('serves a successful live collection from cache until its TTL expires', async () => {
  let requests = 0;
  let timestamp = Date.parse('2026-11-21T00:00:00Z');
  const service = createLiveInternshipService({
    sources: [{ provider: 'greenhouse', token: 'example', company: 'Example Labs' }],
    fetchImpl: async () => { requests += 1; return { ok: true, json: async () => ({ jobs: [liveJob] }) }; },
    now: () => new Date(timestamp), cacheTtlMs: 60_000,
  });

  await service.fetchLiveInternships();
  await service.fetchLiveInternships();
  assert.equal(requests, 1);
  timestamp += 60_001;
  await service.fetchLiveInternships();
  assert.equal(requests, 2);
});

test('coalesces simultaneous cold-cache requests into one upstream refresh', async () => {
  let requests = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const service = createLiveInternshipService({
    sources: [{ provider: 'greenhouse', token: 'example', company: 'Example Labs' }],
    fetchImpl: async () => { requests += 1; await gate; return { ok: true, json: async () => ({ jobs: [liveJob] }) }; },
  });

  const first = service.fetchLiveInternships();
  const second = service.fetchLiveInternships();
  release();
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.equal(requests, 1);
  assert.strictEqual(firstResult, secondResult);
});
