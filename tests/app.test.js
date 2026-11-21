import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterInternships,
  getDetailsUrl,
  isSafeExternalUrl,
  normalizeInternship,
} from '../js/app.js';

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
