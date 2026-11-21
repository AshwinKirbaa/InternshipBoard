# Persistent Internship API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Internship Board with a tested Express and SQLite CRUD API that persists and paginates internship records.

**Architecture:** A SQLite repository owns persistence, a validation module owns request rules, and an Express application owns the HTTP contract. Tests use isolated temporary databases and ephemeral servers.

**Tech Stack:** Node.js 22+, Express, better-sqlite3, Node.js test runner

**Spec:** `docs/superpowers/specs/2026-11-21-persistent-internship-api-design.md`

## Global Constraints

- Preserve the existing frontend and live provider unless compatibility requires a small change.
- Seed the five supplied EdVyro records.
- Return errors as `{ error: { code, message, details? } }`.
- Use test-first red-green-refactor cycles.

## Review Focus

- Malformed JSON returns 400 without crashing.
- Invalid pagination rejects zero, negative, decimal, and oversized values.
- Duplicate internship IDs return 409.
- PATCH distinguishes omitted fields from invalid values.
- Pagination remains deterministic after mutations.

### Task 1: Persistent repository and seed data

Create `backend/db.js`, `backend/schema.sql`, `backend/seed-data.js`, `backend/seed.js`, and `tests/repository.test.js`; update `package.json`. Test schema creation, five-record seeding, deterministic pagination, CRUD persistence, and duplicate IDs before implementing.

### Task 2: Validation and HTTP contract

Create `backend/validation.js`, `backend/app.js`, and `tests/api.test.js`; update `backend/server.js`. Test list metadata, detail, create, replace, patch, delete, 404, 409, 422, invalid pagination, and malformed JSON before implementing.

### Task 3: Frontend integration and documentation

Update `js/data.js`, `README.md`, and relevant contract tests. Prove the frontend consumes paginated `data`, preserves fallback behavior, and documentation covers setup, seed, CRUD, responses, and curl examples.

### Task 4: End-to-end verification

Run a clean install, seed the database, run the full suite, and manually verify `/health` plus a paginated list request. Review the final diff for unrelated/generated artifacts.
