import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../backend/app.js';
import { createDatabase, getApplication, seedDatabase } from '../backend/db.js';

const validRecord = {
  id: 'INT-201',
  title: 'Platform Intern',
  domain: 'Full Stack Development',
  mode: 'Hybrid',
  location: 'Chennai',
  skills: ['Node.js', 'SQL'],
  openings: 2,
  durationWeeks: 8,
  applicationsOpen: true,
};

async function withApi(run, { seed = true } = {}) {
  const db = createDatabase(':memory:');
  if (seed) seedDatabase(db);
  const server = createApp({ db }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    db.close();
  }
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}

test('lists seeded internships with pagination metadata', async () => {
  await withApi(async (baseUrl) => {
    const { response, body } = await jsonRequest(`${baseUrl}/api/internships?page=2&limit=2`);
    assert.equal(response.status, 200);
    assert.deepEqual(body.data.map((item) => item.id), ['INT-103', 'INT-104']);
    assert.deepEqual(body.pagination, { page: 2, limit: 2, total: 5, totalPages: 3, hasNextPage: true, hasPreviousPage: true });
  });
});

test('serves the frontend from the API origin for a working local setup', async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.match(await response.text(), /<title>Internship Board/);

    const favicon = await fetch(`${baseUrl}/assets/favicon.svg`);
    assert.equal(favicon.status, 200);
    assert.match(favicon.headers.get('content-type'), /image\/svg\+xml/);

    const privateFile = await fetch(`${baseUrl}/package.json`);
    assert.equal(privateFile.status, 404);
    assert.equal((await privateFile.json()).error.code, 'NOT_FOUND');
  });
});

test('returns internship detail and a consistent missing-record error', async () => {
  await withApi(async (baseUrl) => {
    const found = await jsonRequest(`${baseUrl}/api/internships/INT-101`);
    assert.equal(found.response.status, 200);
    assert.equal(found.body.data.title, 'Frontend Intern');

    const missing = await jsonRequest(`${baseUrl}/api/internships/INT-999`);
    assert.equal(missing.response.status, 404);
    assert.deepEqual(missing.body, { error: { code: 'NOT_FOUND', message: 'Internship INT-999 was not found' } });
  });
});

test('creates a validated internship and rejects a duplicate ID', async () => {
  await withApi(async (baseUrl) => {
    const created = await jsonRequest(`${baseUrl}/api/internships`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validRecord),
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.response.headers.get('location'), '/api/internships/INT-201');
    assert.deepEqual(created.body.data, validRecord);

    const duplicate = await jsonRequest(`${baseUrl}/api/internships`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validRecord),
    });
    assert.equal(duplicate.response.status, 409);
    assert.equal(duplicate.body.error.code, 'DUPLICATE_ID');
  }, { seed: false });
});

test('replaces and partially updates an internship', async () => {
  await withApi(async (baseUrl) => {
    const replacement = { ...validRecord, title: 'Backend Intern', skills: ['Node.js'], openings: 1 };
    const replaced = await jsonRequest(`${baseUrl}/api/internships/INT-101`, {
      method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(replacement),
    });
    assert.equal(replaced.response.status, 200);
    assert.equal(replaced.body.data.id, 'INT-101');
    assert.equal(replaced.body.data.title, 'Backend Intern');

    const patched = await jsonRequest(`${baseUrl}/api/internships/INT-101`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'Remote', location: 'India' }),
    });
    assert.equal(patched.response.status, 200);
    assert.equal(patched.body.data.mode, 'Remote');
    assert.equal(patched.body.data.title, 'Backend Intern');
  });
});

test('deletes an internship and returns 404 when deleting it again', async () => {
  await withApi(async (baseUrl) => {
    const deleted = await jsonRequest(`${baseUrl}/api/internships/INT-101`, { method: 'DELETE' });
    assert.equal(deleted.response.status, 204);

    const missing = await jsonRequest(`${baseUrl}/api/internships/INT-101`, { method: 'DELETE' });
    assert.equal(missing.response.status, 404);
    assert.equal(missing.body.error.code, 'NOT_FOUND');
  });
});

test('rejects invalid records and empty or invalid PATCH bodies with field details', async () => {
  await withApi(async (baseUrl) => {
    for (const body of [
      { title: '', mode: 'Anywhere', openings: 0 },
      {},
      { openings: null },
      { unknown: 'value' },
    ]) {
      const method = body.title === '' ? 'POST' : 'PATCH';
      const path = method === 'POST' ? '/api/internships' : '/api/internships/INT-101';
      const result = await jsonRequest(`${baseUrl}${path}`, {
        method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      assert.equal(result.response.status, 422);
      assert.equal(result.body.error.code, 'VALIDATION_ERROR');
      assert.ok(result.body.error.details.length > 0);
    }
  });
});

test('rejects invalid pagination values', async () => {
  await withApi(async (baseUrl) => {
    for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=9999999999999999999999', 'limit=0', 'limit=101', 'limit=abc']) {
      const result = await jsonRequest(`${baseUrl}/api/internships?${query}`);
      assert.equal(result.response.status, 400, query);
      assert.equal(result.body.error.code, 'INVALID_PAGINATION');
    }
  });
});

test('returns JSON client errors for oversized bodies and unsupported charsets', async () => {
  await withApi(async (baseUrl) => {
    const oversized = await jsonRequest(`${baseUrl}/api/internships`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'x'.repeat(110_000) }),
    });
    assert.equal(oversized.response.status, 413);
    assert.equal(oversized.body.error.code, 'PAYLOAD_TOO_LARGE');

    const unsupported = await jsonRequest(`${baseUrl}/api/internships`, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=iso-8859-1' },
      body: '{}',
    });
    assert.equal(unsupported.response.status, 415);
    assert.equal(unsupported.body.error.code, 'UNSUPPORTED_MEDIA_TYPE');
  });
});

test('returns 400 for malformed JSON without terminating the server', async () => {
  await withApi(async (baseUrl) => {
    const malformed = await jsonRequest(`${baseUrl}/api/internships`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
    });
    assert.equal(malformed.response.status, 400);
    assert.equal(malformed.body.error.code, 'INVALID_JSON');

    const health = await jsonRequest(`${baseUrl}/health`);
    assert.equal(health.response.status, 200);
    assert.deepEqual(health.body, { status: 'ok', service: 'internship-board-api' });
  });
});

test('includes expected security headers on responses', async () => {
  await withApi(async (baseUrl) => {
    const apiRes = await fetch(`${baseUrl}/api/internships`);
    assert.equal(apiRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(apiRes.headers.get('x-frame-options'), 'DENY');
    assert.equal(apiRes.headers.get('referrer-policy'), 'no-referrer');
    assert.ok(apiRes.headers.get('content-security-policy'));
    assert.ok(apiRes.headers.get('permissions-policy'));
    assert.equal(apiRes.headers.get('x-powered-by'), null);

    const htmlRes = await fetch(`${baseUrl}/`);
    assert.equal(htmlRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(htmlRes.headers.get('x-frame-options'), 'DENY');
    assert.equal(htmlRes.headers.get('referrer-policy'), 'no-referrer');
    assert.ok(htmlRes.headers.get('content-security-policy'));
    assert.ok(htmlRes.headers.get('permissions-policy'));
  });
});

test('submits valid application, returns minimal response, and stores data in DB', async () => {
  let savedDb;
  const db = createDatabase(':memory:');
  seedDatabase(db);
  const server = createApp({ db }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const validApplication = {
      internshipId: 'INT-101',
      fullName: 'Alex Smith',
      email: 'alex@example.com',
      phone: '+1 555-0123',
      coverNote: 'I would love to join your team as a frontend intern for the summer.',
    };

    const { response, body } = await jsonRequest(`${baseUrl}/api/applications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validApplication),
    });

    assert.equal(response.status, 201);
    assert.ok(body.data.id);
    assert.equal(body.data.internshipId, 'INT-101');
    assert.ok(body.data.submittedAt);
    assert.equal(body.data.email, undefined);
    assert.equal(body.data.phone, undefined);
    assert.equal(body.data.coverNote, undefined);
    assert.equal(body.data.fullName, undefined);

    const stored = getApplication(db, body.data.id);
    assert.ok(stored);
    assert.equal(stored.fullName, 'Alex Smith');
    assert.equal(stored.email, 'alex@example.com');
    assert.equal(stored.phone, '+1 555-0123');
    assert.equal(stored.coverNote, validApplication.coverNote);

    // Verify there is no public GET endpoint for applications
    const getRes = await fetch(`${baseUrl}/api/applications`);
    assert.equal(getRes.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

test('rejects application for nonexistent or closed internship', async () => {
  await withApi(async (baseUrl) => {
    const missing = await jsonRequest(`${baseUrl}/api/applications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        internshipId: 'INT-999',
        fullName: 'Alex Smith',
        email: 'alex@example.com',
        coverNote: 'A long enough cover note for the application attempt.',
      }),
    });
    assert.equal(missing.response.status, 404);
    assert.equal(missing.body.error.code, 'NOT_FOUND');

    // Close INT-101
    await jsonRequest(`${baseUrl}/api/internships/INT-101`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationsOpen: false }),
    });

    const closed = await jsonRequest(`${baseUrl}/api/applications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        internshipId: 'INT-101',
        fullName: 'Alex Smith',
        email: 'alex@example.com',
        coverNote: 'A long enough cover note for the application attempt.',
      }),
    });
    assert.equal(closed.response.status, 409);
    assert.equal(closed.body.error.code, 'APPLICATIONS_CLOSED');
  });
});

test('rate limits application submissions per IP and returns Retry-After without blocking GET', async () => {
  const db = createDatabase(':memory:');
  seedDatabase(db);
  let currentTime = 100000;
  const server = createApp({
    db,
    rateLimiterOptions: {
      max: 2,
      windowMs: 60 * 1000,
      now: () => currentTime,
    },
  }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const payload = {
      internshipId: 'INT-101',
      fullName: 'Alex Smith',
      email: 'alex@example.com',
      coverNote: 'A long enough cover note for the application attempt.',
    };

    // Submissions 1 and 2 succeed
    const req1 = await jsonRequest(`${baseUrl}/api/applications`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    });
    assert.equal(req1.response.status, 201);

    const req2 = await jsonRequest(`${baseUrl}/api/applications`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    });
    assert.equal(req2.response.status, 201);

    // Submission 3 hits rate limit
    const req3 = await jsonRequest(`${baseUrl}/api/applications`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    });
    assert.equal(req3.response.status, 429);
    assert.equal(req3.body.error.code, 'RATE_LIMITED');
    assert.ok(req3.response.headers.get('retry-after'));

    // Ordinary GET requests are not rate limited
    const getRes = await jsonRequest(`${baseUrl}/api/internships`);
    assert.equal(getRes.response.status, 200);

    // After window expires, submissions are allowed again
    currentTime += 61 * 1000;
    const req4 = await jsonRequest(`${baseUrl}/api/applications`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    });
    assert.equal(req4.response.status, 201);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
