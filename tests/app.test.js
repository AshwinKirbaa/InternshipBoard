import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterInternships,
  getSourceLabel,
  getRecordUrl,
  getDetailsUrl,
  isSafeExternalUrl,
  normalizeInternship,
} from '../js/app.js';
import { internships as fallbackInternships, loadInternshipDetail, loadInternships } from '../js/data.js';

const records = [
  {
    id: 'INT-101',
    title: 'Frontend Intern',
    domain: 'Full Stack Development',
    mode: 'Remote',
    location: 'India',
    skills: ['HTML', 'CSS', 'JavaScript'],
    openings: 3,
  },
  {
    id: 'INT-104',
    title: 'Data Analyst Intern',
    domain: 'Data Analytics',
    mode: 'On-site',
    location: 'Bengaluru',
    skills: ['Excel', 'SQL', 'Data visualisation'],
    openings: 2,
  },
];

test('normalizes the supplied seed schema including skills and openings', () => {
  const normalized = normalizeInternship(records[0]);
  assert.deepEqual(normalized.skills, ['HTML', 'CSS', 'JavaScript']);
  assert.equal(normalized.openings, 3);
  assert.equal(normalized.title, 'Frontend Intern');
});

test('rejects malformed records without required fields', () => {
  assert.equal(normalizeInternship(null), null);
  assert.equal(normalizeInternship({ title: 'Missing domain' }), null);
  assert.equal(normalizeInternship({ domain: 'Missing title' }), null);
});

test('treats whitespace-only search as no query and trims mixed-case input', () => {
  assert.equal(filterInternships(records, '   ', 'all').length, 2);
  assert.deepEqual(filterInternships(records, '  dAtA  ', 'all').map(({ id }) => id), ['INT-104']);
});

test('searches title, location, domain, mode, and skills', () => {
  for (const query of ['frontend', 'india', 'full stack', 'remote', 'javascript']) {
    assert.deepEqual(filterInternships(records, query, 'all').map(({ id }) => id), ['INT-101']);
  }
});

test('combines query, domain, mode, and skill filters as an intersection', () => {
  assert.deepEqual(filterInternships(records, 'front', 'Full Stack Development', 'Remote', 'JavaScript').map(({ id }) => id), ['INT-101']);
  assert.deepEqual(filterInternships(records, '', 'Full Stack Development', 'On-site', 'all'), []);
});

test('skips malformed records rather than crashing the collection', () => {
  assert.deepEqual(filterInternships([...records, null, { title: 'Broken' }], '', 'all').map(({ id }) => id), ['INT-101', 'INT-104']);
});

test('only accepts HTTP(S) application URLs', () => {
  assert.equal(isSafeExternalUrl('https://example.com/jobs'), true);
  assert.equal(isSafeExternalUrl('http://example.com/jobs'), true);
  assert.equal(isSafeExternalUrl('javascript:alert(1)'), false);
  assert.equal(isSafeExternalUrl('/relative'), false);
  assert.equal(isSafeExternalUrl(undefined), false);
});

test('builds an encoded internal details URL for a record', () => {
  assert.equal(getDetailsUrl('INT-101'), 'internship.html?id=INT-101');
  assert.equal(getDetailsUrl('INT 101/alpha'), 'internship.html?id=INT%20101%2Falpha');
});

test('uses a verified original URL for live records and internal details for samples', () => {
  assert.equal(getRecordUrl({ id: 'live-1', isLive: true, sourceUrl: 'https://example.com/jobs/1' }), 'https://example.com/jobs/1');
  assert.equal(getRecordUrl({ id: 'INT-101', isLive: false }), 'internship.html?id=INT-101');
  assert.equal(getRecordUrl({ id: 'bad', isLive: true, sourceUrl: 'javascript:alert(1)' }), 'internship.html?id=bad');
});

test('loads paginated persistent API records and falls back to supplied samples on failure', async () => {
  const apiPayload = {
    data: [{ ...records[0], id: 'INT-201' }],
    pagination: { page: 1, limit: 100, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
  };
  const loaded = await loadInternships(async () => ({ ok: true, json: async () => apiPayload }));
  assert.equal(loaded.records[0].id, 'INT-201');
  assert.equal(loaded.meta.live, false);
  assert.equal(loaded.meta.persistent, true);
  assert.equal(loaded.meta.count, 1);
  assert.equal(loaded.records[0].isSample, false);

  const fallback = await loadInternships(async () => { throw new Error('offline'); });
  assert.equal(fallback.records.length, fallbackInternships.length);
  assert.equal(fallback.meta.live, false);
  assert.equal(fallback.meta.fallback, true);
  assert.equal(fallback.records[0].isSample, true);
});

test('loads persistent detail records and falls back only for supplied IDs', async () => {
  const persistent = await loadInternshipDetail('INT-201', async () => ({
    ok: true,
    json: async () => ({ data: { ...records[0], id: 'INT-201' } }),
  }));
  assert.equal(persistent.id, 'INT-201');
  assert.equal(persistent.isSample, false);

  const supplied = await loadInternshipDetail('INT-101', async () => { throw new Error('offline'); });
  assert.equal(supplied.title, 'Frontend Intern');
  assert.equal(supplied.isSample, true);
  const missing = await loadInternshipDetail('INT-101', async () => ({ ok: false, status: 404 }));
  assert.equal(missing, null);
});

test('labels live, database, and fallback records according to their real source', () => {
  assert.equal(getSourceLabel({ isLive: true, source: 'Greenhouse' }), 'Live · Greenhouse');
  assert.equal(getSourceLabel({ isSample: true }), 'Supplied sample record');
  assert.equal(getSourceLabel({}), 'Project database record');
});

test('accepts an authoritative empty database without substituting seed records', async () => {
  const loaded = await loadInternships(async () => ({
    ok: true,
    json: async () => ({ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }),
  }));
  assert.deepEqual(loaded.records, []);
  assert.equal(loaded.meta.persistent, true);
  assert.equal(loaded.meta.count, 0);
});

test('loads every page so frontend search and totals include records after 100', async () => {
  const calls = [];
  const firstPage = Array.from({ length: 100 }, (_, index) => ({ ...records[0], id: `INT-${String(index + 1).padStart(3, '0')}` }));
  const loaded = await loadInternships(async (url) => {
    calls.push(url);
    return url.includes('page=2')
      ? { ok: true, json: async () => ({ data: [{ ...records[0], id: 'INT-101' }], pagination: { page: 2, limit: 100, total: 101, totalPages: 2, hasNextPage: false, hasPreviousPage: true } }) }
      : { ok: true, json: async () => ({ data: firstPage, pagination: { page: 1, limit: 100, total: 101, totalPages: 2, hasNextPage: true, hasPreviousPage: false } }) };
  });
  assert.equal(loaded.records.length, 101);
  assert.deepEqual(calls, ['/api/internships?limit=100&page=1', '/api/internships?limit=100&page=2']);
});
