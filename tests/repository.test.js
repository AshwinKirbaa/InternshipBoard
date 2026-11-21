import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDatabase,
  createInternship,
  deleteInternship,
  getInternship,
  listInternships,
  replaceInternship,
  seedDatabase,
  updateInternship,
} from '../backend/db.js';

const record = {
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

function memoryDatabase() {
  const db = createDatabase(':memory:');
  test.after(() => db.close());
  return db;
}

test('creates the schema and seeds the five supplied internships idempotently', () => {
  const db = memoryDatabase();
  seedDatabase(db);
  seedDatabase(db);

  const result = listInternships(db, { page: 1, limit: 10 });
  assert.equal(result.total, 5);
  assert.deepEqual(result.items.map((item) => item.id), ['INT-101', 'INT-102', 'INT-103', 'INT-104', 'INT-105']);
  assert.deepEqual(result.items[0].skills, ['HTML', 'CSS', 'JavaScript']);
});

test('paginates records in deterministic ID order', () => {
  const db = memoryDatabase();
  seedDatabase(db);

  const result = listInternships(db, { page: 2, limit: 2 });
  assert.equal(result.total, 5);
  assert.deepEqual(result.items.map((item) => item.id), ['INT-103', 'INT-104']);
});

test('persists create, detail, replace, partial update, and delete operations', () => {
  const db = memoryDatabase();
  assert.deepEqual(createInternship(db, record), record);
  assert.deepEqual(getInternship(db, record.id), record);

  const replacement = { ...record, title: 'Backend Intern', skills: ['Node.js'], openings: 1 };
  assert.deepEqual(replaceInternship(db, record.id, replacement), replacement);

  const updated = updateInternship(db, record.id, { mode: 'Remote', location: 'India' });
  assert.equal(updated.mode, 'Remote');
  assert.equal(updated.location, 'India');
  assert.equal(updated.title, 'Backend Intern');

  assert.equal(deleteInternship(db, record.id), true);
  assert.equal(getInternship(db, record.id), null);
  assert.equal(deleteInternship(db, record.id), false);
});

test('surfaces a duplicate ID constraint error', () => {
  const db = memoryDatabase();
  createInternship(db, record);
  assert.throws(() => createInternship(db, record), (error) => error.code === 'DUPLICATE_ID');
});
