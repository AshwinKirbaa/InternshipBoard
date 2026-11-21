import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../backend/app.js';
import { createDatabase, seedDatabase } from '../backend/db.js';

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
