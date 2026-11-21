import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractSkills,
  isInternshipOpening,
  normalizeGreenhouseJob,
  normalizeGreenhouseResponses,
} from '../backend/provider.js';
import { fetchLiveInternships } from '../backend/server.js';

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

test('fetches and merges successful public boards while tolerating one failed board', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/broken/')) return { ok: false, status: 503 };
    return { ok: true, json: async () => ({ jobs: [liveJob] }) };
  };
  const boards = [{ token: 'example', company: 'Example Labs' }, { token: 'broken', company: 'Broken' }];
  const result = await fetchLiveInternships({ fetchImpl, boards, now: () => new Date('2026-11-21T00:00:00Z') });
  assert.equal(result.internships.length, 1);
  assert.equal(result.meta.source, 'Official Greenhouse job boards');
  assert.equal(result.meta.boardsChecked, 2);
  assert.equal(result.meta.boardsAvailable, 1);
});

test('rejects when every board fails or returns no internships', async () => {
  const boards = [{ token: 'empty', company: 'Empty' }];
  await assert.rejects(() => fetchLiveInternships({ boards, fetchImpl: async () => ({ ok: false, status: 503 }) }), /no live internship openings/i);
  await assert.rejects(() => fetchLiveInternships({ boards, fetchImpl: async () => ({ ok: true, json: async () => ({ jobs: [] }) }) }), /no live internship openings/i);
});
