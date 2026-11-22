import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { seedInternships } from './seed-data.js';

const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));
const columns = {
  title: 'title', domain: 'domain', mode: 'mode', location: 'location', skills: 'skills',
  openings: 'openings', durationWeeks: 'duration_weeks', applicationsOpen: 'applications_open',
};

function serializeValue(key, value) {
  if (key === 'skills') return JSON.stringify(value);
  if (key === 'applicationsOpen') return value ? 1 : 0;
  return value;
}

function toInternship(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    domain: row.domain,
    mode: row.mode,
    location: row.location,
    skills: JSON.parse(row.skills),
    openings: row.openings,
    durationWeeks: row.duration_weeks,
    applicationsOpen: Boolean(row.applications_open),
  };
}

export function createDatabase(filename = process.env.DATABASE_PATH || 'data/internships.db') {
  if (filename !== ':memory:') mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(readFileSync(schemaPath, 'utf8'));
  return db;
}

export function listInternships(db, { page, limit }) {
  const total = Number(db.prepare('SELECT COUNT(*) AS count FROM internships').get().count);
  const rows = db.prepare('SELECT * FROM internships ORDER BY id LIMIT ? OFFSET ?').all(limit, (page - 1) * limit);
  return { items: rows.map(toInternship), total };
}

export function getInternship(db, id) {
  return toInternship(db.prepare('SELECT * FROM internships WHERE id = ?').get(id));
}

export function createInternship(db, record) {
  try {
    db.prepare(`INSERT INTO internships
      (id, title, domain, mode, location, skills, openings, duration_weeks, applications_open)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(record.id, record.title, record.domain, record.mode, record.location, JSON.stringify(record.skills), record.openings, record.durationWeeks, record.applicationsOpen ? 1 : 0);
  } catch (error) {
    if (error.errcode === 1555) {
      const duplicate = new Error(`Internship ${record.id} already exists`);
      duplicate.code = 'DUPLICATE_ID';
      throw duplicate;
    }
    throw error;
  }
  return getInternship(db, record.id);
}

export function replaceInternship(db, id, record) {
  const result = db.prepare(`UPDATE internships SET
    title = ?, domain = ?, mode = ?, location = ?, skills = ?, openings = ?, duration_weeks = ?, applications_open = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`)
    .run(record.title, record.domain, record.mode, record.location, JSON.stringify(record.skills), record.openings, record.durationWeeks, record.applicationsOpen ? 1 : 0, id);
  return result.changes ? getInternship(db, id) : null;
}

export function updateInternship(db, id, changes) {
  const entries = Object.entries(changes).filter(([key]) => key in columns);
  if (!entries.length) return getInternship(db, id);
  const assignments = entries.map(([key]) => `${columns[key]} = ?`).join(', ');
  const values = entries.map(([key, value]) => serializeValue(key, value));
  const result = db.prepare(`UPDATE internships SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);
  return result.changes ? getInternship(db, id) : null;
}

export function deleteInternship(db, id) {
  return db.prepare('DELETE FROM internships WHERE id = ?').run(id).changes > 0;
}

export function createApplication(db, record) {
  const id = record.id || randomUUID();
  const createdAt = record.createdAt || new Date().toISOString();
  db.prepare(`INSERT INTO applications
    (id, internship_id, full_name, email, phone, cover_note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    record.internshipId,
    record.fullName,
    record.email,
    record.phone ?? null,
    record.coverNote,
    createdAt
  );
  return {
    id,
    internshipId: record.internshipId,
    submittedAt: createdAt,
  };
}

export function getApplication(db, id) {
  const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
  if (!row) return null;
  return {
    id: row.id,
    internshipId: row.internship_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    coverNote: row.cover_note,
    createdAt: row.created_at,
  };
}

export function seedDatabase(db, { overwrite = false } = {}) {
  db.exec('BEGIN');
  try {
    const conflictAction = overwrite ? 'REPLACE' : 'IGNORE';
    const insert = db.prepare(`INSERT OR ${conflictAction} INTO internships
      (id, title, domain, mode, location, skills, openings, duration_weeks, applications_open)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of seedInternships) {
      insert.run(item.id, item.title, item.domain, item.mode, item.location, JSON.stringify(item.skills), item.openings, item.durationWeeks, item.applicationsOpen ? 1 : 0);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
