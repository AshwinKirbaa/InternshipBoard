import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../backend/app.js';
import { createDatabase, seedDatabase } from '../backend/db.js';

async function withTestServer(options, run) {
  const db = options.db !== undefined ? options.db : createDatabase(':memory:');
  if (db && options.seed !== false) seedDatabase(db);

  const logs = [];
  const errorLogs = [];
  const logger = (entry) => logs.push(entry);
  const errorLogger = (entry) => errorLogs.push(entry);

  const app = createApp({
    db,
    logger,
    errorLogger,
    ...options,
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await run({ baseUrl, logs, errorLogs, db });
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    if (db && typeof db.close === 'function') {
      try {
        db.close();
      } catch {
        // Already closed in test
      }
    }
  }
}

test('GET /health and GET /health/live return 200 liveness status', async () => {
  await withTestServer({}, async ({ baseUrl }) => {
    const res1 = await fetch(`${baseUrl}/health`);
    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    assert.deepEqual(body1, { status: 'ok', service: 'internship-board-api' });

    const res2 = await fetch(`${baseUrl}/health/live`);
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.deepEqual(body2, { status: 'ok', service: 'internship-board-api' });
  });
});

test('GET /health/ready and GET /ready return 200 when database is healthy', async () => {
  await withTestServer({}, async ({ baseUrl }) => {
    const res = await fetch(`${baseUrl}/health/ready`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ready');
    assert.equal(body.service, 'internship-board-api');
    assert.equal(body.checks.database, 'ok');

    const resAlias = await fetch(`${baseUrl}/ready`);
    assert.equal(resAlias.status, 200);
    const bodyAlias = await resAlias.json();
    assert.equal(bodyAlias.status, 'ready');
    assert.equal(bodyAlias.checks.database, 'ok');
  });
});

test('GET /health/ready returns 503 when database is unavailable', async () => {
  // Test with a closed database
  const db = createDatabase(':memory:');
  db.close();

  await withTestServer({ db, seed: false }, async ({ baseUrl }) => {
    const res = await fetch(`${baseUrl}/health/ready`);
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.status, 'unavailable');
    assert.equal(body.service, 'internship-board-api');
    assert.equal(body.checks.database, 'error');
    // Ensure internal database details or error messages are not leaked
    assert.equal(body.error?.details, undefined);
    assert.equal(body.error?.stack, undefined);
  });
});

test('structured request logging captures method, route, status, duration, timestamp, and requestId', async () => {
  await withTestServer({}, async ({ baseUrl, logs }) => {
    const res = await fetch(`${baseUrl}/api/internships`);
    assert.equal(res.status, 200);

    // Wait slightly for finish event to fire if needed
    await new Promise((r) => setTimeout(r, 10));

    assert.ok(logs.length >= 1, 'Expected at least one request log');
    const log = logs[logs.length - 1];
    assert.equal(log.method, 'GET');
    assert.equal(log.route, '/api/internships');
    assert.equal(log.status, 200);
    assert.equal(typeof log.durationMs, 'number');
    assert.ok(log.durationMs >= 0);
    assert.equal(typeof log.timestamp, 'string');
    assert.ok(!Number.isNaN(Date.parse(log.timestamp)));
    assert.equal(typeof log.requestId, 'string');
    assert.ok(log.requestId.length > 0);

    // Response header includes X-Request-Id matching the log
    assert.equal(res.headers.get('x-request-id'), log.requestId);
  });
});

test('incoming X-Request-Id header is propagated and logged', async () => {
  const customId = 'req-trace-capstone-12345';
  await withTestServer({}, async ({ baseUrl, logs }) => {
    const res = await fetch(`${baseUrl}/health`, {
      headers: { 'x-request-id': customId },
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-request-id'), customId);

    await new Promise((r) => setTimeout(r, 10));
    const log = logs.find((l) => l.requestId === customId);
    assert.ok(log, 'Expected log with propagated requestId');
    assert.equal(log.requestId, customId);
  });
});

test('application submission logging omits PII, request bodies, and secrets', async () => {
  await withTestServer({}, async ({ baseUrl, logs }) => {
    const sensitivePayload = {
      internshipId: 'INT-101',
      fullName: 'Secret Applicant',
      email: 'applicant@example.com',
      phone: '+1-555-0199',
      coverNote: 'Confidential personal cover note for this application.',
    };

    const res = await fetch(`${baseUrl}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sensitivePayload),
    });
    assert.equal(res.status, 201);

    await new Promise((r) => setTimeout(r, 10));
    const log = logs.find((l) => l.route === '/api/applications');
    assert.ok(log, 'Expected log for application submission');
    assert.equal(log.method, 'POST');
    assert.equal(log.status, 201);

    // Ensure no PII in log object
    const serializedLog = JSON.stringify(log);
    assert.ok(!serializedLog.includes('Secret Applicant'));
    assert.ok(!serializedLog.includes('applicant@example.com'));
    assert.ok(!serializedLog.includes('+1-555-0199'));
    assert.ok(!serializedLog.includes('Confidential personal cover note'));
    assert.equal(log.body, undefined);
  });
});

test('controlled server errors log useful operational context without leaking stack traces or PII', async () => {
  await withTestServer({}, async ({ baseUrl, errorLogs }) => {
    // Malformed JSON triggering 400 error middleware
    const res = await fetch(`${baseUrl}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ malformed json ',
    });
    assert.equal(res.status, 400);

    await new Promise((r) => setTimeout(r, 10));
    assert.ok(errorLogs.length >= 1, 'Expected at least one error log');
    const errLog = errorLogs[0];
    assert.equal(errLog.level, 'error');
    assert.equal(errLog.method, 'POST');
    assert.equal(errLog.route, '/api/applications');
    assert.equal(errLog.status, 400);
    assert.equal(typeof errLog.requestId, 'string');
    assert.equal(errLog.stack, undefined);
  });
});
