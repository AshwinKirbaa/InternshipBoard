import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createApplication,
  createDatabase,
  createInternship,
  deleteInternship,
  getApplication,
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

test('repeat seeding preserves edits unless reset is explicitly requested', () => {
  const db = memoryDatabase();
  seedDatabase(db);
  updateInternship(db, 'INT-101', { title: 'Edited Frontend Internship' });

  seedDatabase(db);
  assert.equal(getInternship(db, 'INT-101').title, 'Edited Frontend Internship');

  seedDatabase(db, { overwrite: true });
  assert.equal(getInternship(db, 'INT-101').title, 'Frontend Intern');
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

test('persists an application and enforces foreign key constraints', () => {
  const db = memoryDatabase();
  seedDatabase(db);

  const applicationData = {
    internshipId: 'INT-101',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555-0199',
    coverNote: 'I am excited to apply for this frontend engineering internship.',
  };

  const created = createApplication(db, applicationData);
  assert.ok(created.id);
  assert.equal(created.internshipId, 'INT-101');
  assert.ok(created.submittedAt);

  const stored = getApplication(db, created.id);
  assert.equal(stored.id, created.id);
  assert.equal(stored.internshipId, 'INT-101');
  assert.equal(stored.fullName, 'Jane Doe');
  assert.equal(stored.email, 'jane@example.com');
  assert.equal(stored.phone, '+1 555-0199');
  assert.equal(stored.coverNote, applicationData.coverNote);

  // Foreign key constraint rejects application for nonexistent internship
  assert.throws(() => {
    createApplication(db, {
      ...applicationData,
      internshipId: 'NONEXISTENT-999',
    });
  });

  // SQL-like string is treated purely as text
  const sqlInjectionAttempt = {
    internshipId: 'INT-101',
    fullName: "Robert'); DROP TABLE applications;--",
    email: 'bobby@example.com',
    phone: null,
    coverNote: "'; DELETE FROM internships WHERE '1'='1",
  };
  const sqlCreated = createApplication(db, sqlInjectionAttempt);
  const sqlStored = getApplication(db, sqlCreated.id);
  assert.equal(sqlStored.fullName, "Robert'); DROP TABLE applications;--");
  assert.equal(sqlStored.coverNote, "'; DELETE FROM internships WHERE '1'='1");
  assert.equal(listInternships(db, { page: 1, limit: 10 }).total, 5);
});
