# Live Multi-Provider Internships Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore live internship discovery using official Greenhouse, Lever, and Ashby feeds without changing the persistent internship CRUD contract.

**Architecture:** Focused provider adapters normalize public JSON feeds; an aggregator isolates failures, deduplicates, sorts, and caches. A separate live endpoint keeps volatile data outside SQLite, and the frontend falls back to the existing paginated API.

**Tech Stack:** Node.js 22, Express 5, built-in fetch/node:test, vanilla JavaScript

**Spec:** `docs/superpowers/specs/2026-11-21-live-multi-provider-internships-design.md`

## Global Constraints

- Preserve all existing persistent CRUD routes, schema fields, validation, pagination, and seed records.
- Use official public JSON feeds only; do not scrape protected HTML pages.
- A single failed or malformed source must not fail a non-empty aggregate.
- Live records must include a safe original source URL and source attribution.

## Review Focus

- One provider times out while others succeed: return successful results.
- Providers return duplicate URLs: return one record.
- Every provider fails or returns no internships: return a controlled unavailable response and let the frontend fall back.
- Provider payload is malformed: isolate it as a provider failure.
- Cache is warm: do not repeat upstream requests before expiry.

---

### Task 1: Provider adapters and aggregation

**Files:**
- Create: `backend/live-providers.js`
- Modify: `backend/provider.js`
- Modify: `backend/server.js`
- Test: `tests/backend.test.js`

**Interfaces:**
- Produces: `fetchLiveInternships({ fetchImpl, now, sources, cacheTtlMs })` returning `{ internships, meta }`.

- [ ] Write failing adapter tests for Greenhouse, Lever, Ashby, deduplication, partial failure, malformed payloads, and caching.
- [ ] Run `node --test tests/backend.test.js` and verify the new tests fail for missing behavior.
- [ ] Implement provider normalization and the resilient cached aggregator.
- [ ] Run `node --test tests/backend.test.js` and verify it passes.

### Task 2: Live API route

**Files:**
- Modify: `backend/app.js`
- Modify: `backend/server.js`
- Test: `tests/api.test.js`

**Interfaces:**
- Consumes: injected `liveInternships` loader.
- Produces: `GET /api/live-internships` with `data` and live metadata, or a `503 LIVE_DATA_UNAVAILABLE` envelope.

- [ ] Write failing route tests for success and total provider failure while proving persistent routes remain intact.
- [ ] Run `node --test tests/api.test.js` and verify failure for the absent route.
- [ ] Inject the loader and add the route without altering `/api/internships`.
- [ ] Run `node --test tests/api.test.js` and verify it passes.

### Task 3: Frontend live-first loading

**Files:**
- Modify: `js/data.js`
- Modify: `js/app.js`
- Modify: `README.md`
- Test: `tests/app.test.js`

**Interfaces:**
- Produces: `loadInternships()` requesting `/api/live-internships` first and using the existing paginated persistent loader as fallback.

- [ ] Write failing tests for live success, live empty/error fallback, and accurate source metadata.
- [ ] Run `node --test tests/app.test.js` and verify the new tests fail for persistent-first loading.
- [ ] Implement live-first loading and honest UI disclosure.
- [ ] Run `npm test` and verify the full suite passes.

### Task 4: Production verification

**Files:**
- Modify only if verification exposes a defect.

- [ ] Run browser QA and inspect the live endpoint locally.
- [ ] Review the branch, commit, push, merge, and deploy.
- [ ] Verify production returns multiple source-attributed live records and persistent CRUD still responds.
