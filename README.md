# Internship Board

Internship Board is a responsive full-stack portfolio project. It aggregates current internships from official Greenhouse, Lever, and Ashby employer feeds while its Express REST API retains a separate SQLite CRUD collection with validation and pagination. EdVyro's five supplied records remain the final offline fallback.

## Features

- Persistent SQLite records seeded from EdVyro's five supplied internships
- Live, source-attributed openings from official Greenhouse, Lever, and Ashby feeds
- Partial-provider failure isolation, URL deduplication, and a 15-minute successful-response cache
- List, detail, create, replace, update, and delete API endpoints
- Validated inputs, predictable status codes, and consistent JSON errors
- Paginated list responses
- Search plus domain, work-mode, and skill filters
- Internal record detail pages backed by the API
- Responsive one-, two-, and three-column layouts
- Loading, empty, fallback, and recoverable error states
- Keyboard-accessible navigation and visible focus states

> **Data note:** Live listings open the employer's original posting and are never written into SQLite. The five seeded internships are fictional records supplied for the EdVyro portfolio exercise and remain available through the persistent CRUD API.

## Technology stack

- Semantic HTML5 and mobile-first CSS
- Vanilla JavaScript ES modules
- Node.js 22.13 or newer
- Express 5
- SQLite through Node.js's built-in `node:sqlite` module
- Node.js built-in test runner
- Headless Chrome browser QA

There is no frontend framework, CSS framework, or build step.

## Project structure

```text
.
├── backend/
│   ├── app.js             # Express routes and response contract
│   ├── db.js              # SQLite repository
│   ├── schema.sql         # Persistent data model
│   ├── seed-data.js       # Five supplied EdVyro records
│   ├── seed.js            # Repeatable seed command
│   ├── provider.js        # Earlier live-provider normalizer
│   └── server.js          # Process entry point
├── css/styles.css
├── js/
│   ├── app.js
│   ├── data.js
│   └── details.js
├── tests/
├── index.html
├── internship.html
└── package.json
```

## Run locally

1. Install dependencies and seed the database:

   ```powershell
   npm install
   npm run db:seed
   ```

2. Start the full application:

   ```powershell
   npm start
   ```

3. Open <http://localhost:10000>. Express serves both the frontend and `/api`, so records created through the API appear in the board without a development proxy.

`npm run db:seed` only inserts missing seed IDs and preserves edits. To restore the five supplied records to their original values, run `npm run db:seed:reset` explicitly.

Copy `.env.example` to `.env` if you want a local reference, then set values in your shell or hosting provider. The app reads `PORT`, `DATABASE_PATH`, and `ALLOWED_ORIGINS`; it intentionally does not load `.env` files automatically.

## Data model

An internship contains:

- `id`: unique string identifier
- `title`, `domain`, and `location`: non-empty strings
- `mode`: `Remote`, `Hybrid`, or `On-site`
- `skills`: one to twenty unique, non-empty strings
- `openings`: integer from 1 to 1000
- `durationWeeks`: `null` or integer from 1 to 104
- `applicationsOpen`: boolean

## REST API

All responses use JSON except successful deletion (`204 No Content`). List responses use `{ "data": [...], "pagination": {...} }`; single-record responses use `{ "data": {...} }`. Errors use `{ "error": { "code", "message", "details"? } }`.

| Method | Endpoint | Purpose | Success |
| --- | --- | --- | --- |
| `GET` | `/health` | Lightweight service liveness check | `200` |
| `GET` | `/health/ready` | Readiness check (verifies database accessibility) | `200` / `503` |
| `GET` | `/api/live-internships` | Cached live openings from official employer feeds | `200` |
| `GET` | `/api/internships?page=1&limit=10` | Paginated list | `200` |
| `GET` | `/api/internships/:id` | Record detail | `200` |
| `POST` | `/api/internships` | Create a record | `201` |
| `PUT` | `/api/internships/:id` | Replace a record | `200` |
| `PATCH` | `/api/internships/:id` | Update selected fields | `200` |
| `DELETE` | `/api/internships/:id` | Delete a record | `204` |
| `POST` | `/api/applications` | Submit application (rate-limited, validated) | `201` |

`page` must be a positive integer. `limit` must be an integer between 1 and 100. Invalid input returns `422`, missing records return `404`, and duplicate IDs return `409`.

### API examples

List the first two records:

```powershell
curl.exe "http://localhost:10000/api/internships?page=1&limit=2"
```

Create a record:

```powershell
curl.exe -X POST http://localhost:10000/api/internships `
  -H "Content-Type: application/json" `
  -d '{"id":"INT-201","title":"Platform Intern","domain":"Full Stack Development","mode":"Hybrid","location":"Chennai","skills":["Node.js","SQL"],"openings":2,"durationWeeks":8,"applicationsOpen":true}'
```

Update and delete it:

```powershell
curl.exe -X PATCH http://localhost:10000/api/internships/INT-201 -H "Content-Type: application/json" -d '{"mode":"Remote","location":"India"}'
curl.exe -X DELETE http://localhost:10000/api/internships/INT-201
```

## Search and accessibility

Search is case-insensitive and matches title, location, domain, mode, and skills. Filters intersect with the current query. The interface uses semantic landmarks, explicit labels, live status announcements, a skip link, visible focus rings, touch-friendly controls, and reduced-motion support.

## Testing

Run all unit, repository, API, and markup contract tests:

```powershell
npm test
```

Run browser QA and regenerate screenshots on Windows with Chrome installed:

```powershell
npm run test:browser
```

## Deployment

The static frontend can remain on Vercel with `/api/*` rewritten to the Render service. The included `render.yaml` starts the Express API and configures its health check and allowed browser origin.

The hosted API inserts any missing supplied seed records before each start. Existing rows and edits are preserved.

SQLite persists locally. The included Render Blueprint uses a 1 GB persistent disk mounted at `/var/data` and a `DATABASE_PATH` on that disk. This requires an eligible paid Render plan; review current pricing before applying the Blueprint.

Current project URLs from the earlier milestone:

- Frontend: <https://internship-board-two.vercel.app/>
- API health: <https://internship-board-api-3497.onrender.com/health>

## Task 3: Secure Application Integration

Task 3 adds end-to-end, privacy-respecting internship applications with defense-in-depth security, client-side validation, server validation, rate limiting, and automated tests.

### What was added

1. **Additive SQLite applications table:** Idempotent `applications` table in `backend/schema.sql` referencing `internships(id)` with foreign key enforcement and parameterized SQL execution.
2. **Server-side validation:** Independent validator `validateApplication` in `backend/validation.js` rejecting unknown fields, oversized payloads, invalid formats, closed internships, or nonexistent records without leaking stack traces or SQL errors.
3. **Application API endpoint:** `POST /api/applications` returning a minimal `{ data: { id, internshipId, submittedAt } }` response without echoing applicant personal data. Submitted applications are never exposed through any public GET endpoint.
4. **Per-IP rate limiter:** Configurable in-memory rate limiter (`backend/rate-limiter.js`) applied strictly to `POST /api/applications` (default: 5 submissions per 15 minutes) returning HTTP `429` with `Retry-After` header and automatic expired entry cleanup, without impacting ordinary GET requests.
5. **Secure response headers:** Enforced on API and frontend responses:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: no-referrer`
   - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
   - Disabled `x-powered-by`
6. **Frontend application form:** Semantic, accessible form on `internship.html` with explicit `<label>`s, input types, `aria-describedby` error associations, `aria-invalid` states, `role="status"` live announcements, first-invalid focus management, duplicate-submission prevention, and preserved form data upon failure.
7. **Automated test suite:** Comprehensive unit, integration, accessibility, and browser QA test coverage.

### Installation and running

Install dependencies:

```powershell
npm install
```

Seed the database:

```powershell
npm run db:seed
```

Start the application:

```powershell
npm start
```

### Running tests

Run all unit, repository, contract, API, and validation tests:

```powershell
npm test
```

Run browser QA:

```powershell
npm run test:browser
```

Run the complete test suite:

```powershell
npm run test:all
```

### `POST /api/applications` Contract

- **Method:** `POST`
- **Path:** `/api/applications`
- **Headers:** `Content-Type: application/json`, `Accept: application/json`

#### Accepted fields

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `internshipId` | String | Yes | Must match an existing internship with `applicationsOpen: true` |
| `fullName` | String | Yes | Trimmed, 2–100 characters |
| `email` | String | Yes | Trimmed, lowercase normalized, valid email, max 254 characters |
| `phone` | String | No | Optional. If provided, conservative international format (7–25 characters) |
| `coverNote` | String | Yes | Trimmed, 20–2000 characters |

*Any unrecognized field is rejected with `422 Unprocessable Content`.*

#### Success response (`201 Created`)

```json
{
  "data": {
    "id": "e5c70281-9b16-4357-9d22-d04b3e8e2fa5",
    "internshipId": "INT-101",
    "submittedAt": "2026-11-22T03:00:00.000Z"
  }
}
```

*Personal details (`fullName`, `email`, `phone`, `coverNote`) are never returned in the response.*

#### Expected status codes

- `201 Created`: Application validated and stored.
- `400 Bad Request`: Malformed JSON or invalid body type.
- `404 Not Found`: Internship does not exist.
- `409 Conflict`: Applications are closed for this internship (`APPLICATIONS_CLOSED`).
- `413 Payload Too Large`: Request body exceeds 100 KB limit.
- `415 Unsupported Media Type`: Non-UTF-8 or unsupported body charset.
- `422 Unprocessable Content`: Validation failure with structured field details (`VALIDATION_ERROR`).
- `429 Too Many Requests`: Rate limit exceeded (`RATE_LIMITED`).

#### Example requests

Valid submission:

```powershell
curl.exe -X POST http://localhost:10000/api/applications `
  -H "Content-Type: application/json" `
  -d '{"internshipId":"INT-101","fullName":"Alex Morgan","email":"alex@example.com","phone":"+1 555-0199","coverNote":"I have strong experience in frontend web development and would love to contribute to this team."}'
```

Invalid submission (too-short cover note and invalid email):

```powershell
curl.exe -X POST http://localhost:10000/api/applications `
  -H "Content-Type: application/json" `
  -d '{"internshipId":"INT-101","fullName":"Alex","email":"bad-email","coverNote":"Short"}'
```

Response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Application data is invalid",
    "details": [
      { "field": "email", "message": "must be a valid email address of at most 254 characters" },
      { "field": "coverNote", "message": "must be between 20 and 2000 characters" }
    ]
  }
}
```

### Security checklist

- [x] **Client-side validation:** Validates required fields, formats, lengths, and constraints before sending, managing accessible focus and live status announcements.
- [x] **Server-side validation:** Independent validator verifying types, ranges, lengths, and email/phone formats; rejects unrecognized properties.
- [x] **Parameterized queries:** SQLite prepared statements with `?` placeholders for all user-supplied data prevent SQL injection.
- [x] **Strict accepted fields:** Whitelist enforcement rejects extra or unexpected properties with `422`.
- [x] **Secure response headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, compatible same-origin `Content-Security-Policy`, restrictive `Permissions-Policy`, and `x-powered-by` disabled.
- [x] **Rate limiting:** Strict per-IP rate limiting on `POST /api/applications` returning `429` with `Retry-After` header. Expired entries are automatically pruned.
- [x] **Body-size limits:** Enforced 100 KB JSON payload cap rejects oversized payloads with `413 Payload Too Large`.
- [x] **Origin protection:** Allowlist enforcement restricts unauthorized cross-origin API calls with `403`.
- [x] **Generic error handling:** Prevents stack trace or SQL leakage in responses.
- [x] **No public application endpoint:** No GET route exposes applicant records. Applications are private to backend storage.

### Production deployment considerations

- **In-memory rate limiter:** The current limiter uses an in-memory `Map` with automatic cleanup, suitable for single-node instances. Production deployments distributed across multiple load-balanced nodes or serverless containers must back the limiter with a shared distributed store (such as Redis or Memcached) to enforce global rate limits across instances.
- **Proxy trust:** Express proxy header trust (`X-Forwarded-For`) is disabled by default and should only be enabled via explicit configuration (`TRUST_PROXY`) when running behind a trusted reverse proxy.
- **Portfolio data note:** All supplied internship listings and applicant samples are fictional portfolio data supplied by EdVyro.

## Task 4: Production-Ready Capstone

Task 4 completes the production readiness audit and hardening of the Internship Board application, establishing production-grade observability, health monitoring, responsive and accessibility assurance, defense-in-depth security, and reproducible verification evidence.

### 1. Production Observability and Structured Logging

- **Structured JSON Logging:** Requests are emitted as single-line JSON records containing `timestamp`, `requestId`, `method`, `route`, `status`, and `durationMs`.
- **Correlation ID Tracking:** Every request receives an `X-Request-Id` (propagating upstream client headers or generating a cryptographic UUID), returned in the response headers for end-to-end tracing.
- **Strict Privacy & Redaction:**
  - Request bodies are **never** logged.
  - Applicant personal information (`fullName`, `email`, `phone`, `coverNote`) is strictly excluded from logs.
  - URL query strings are stripped from the logged `route` path to avoid leaking sensitive query tokens.
  - Stack traces and internal filesystem paths are suppressed from operational logs.
- **Controlled Error Logging:** Server errors record useful operational context (level, method, clean route, HTTP status, and application error code) without leaking database internals.

### 2. Strengthened Health Checks

- **Liveness (`GET /health` & `GET /health/live`):** Lightweight check confirming the Node/Express process is running and responding to HTTP traffic (`200 OK`).
- **Readiness (`GET /health/ready` & `GET /ready`):** Verifies database availability by executing a fast `SELECT 1 AS ready` check against the SQLite instance.
  - Returns `200 OK` with `{ "status": "ready", "service": "internship-board-api", "checks": { "database": "ok" } }` when healthy.
  - Returns `503 Service Unavailable` with `{ "status": "unavailable", "service": "internship-board-api", "checks": { "database": "error" } }` if the database is disconnected or degraded, without exposing internal errors.

### 3. Quality & Assurance Audit Summary

- **Unit & Integration Suite:** 74 tests passing (`npm test`), covering pagination, CRUD, validation, schema idempotency, error formats, rate limiting, and health checks.
- **Browser QA Suite:** 15 automated checks passing with 0 console errors (`npm run test:browser`), validating viewports from 360px to 1920px, keyboard drawer navigation, filters, empty/error recovery, and details/application submission flows.
- **Accessibility:** Semantic HTML5 landmarks, skip links, high-contrast focus rings, touch targets >= 44px, and ARIA live regions for status announcements.
- **Single Public Proof Link:** <https://github.com/AshwinKirbaa/InternshipBoard>
- **Full QA Report:** Detailed audit logs, check results, commands, dates, and limitations are documented in [reports/capstone-qa-report.md](reports/capstone-qa-report.md).

### 4. Reproduction and Verification Commands

Run all unit, API, schema, validation, and health tests:

```powershell
npm test
```

Run browser QA and regenerate all responsive screenshots:

```powershell
npm run test:browser
```

Run the complete test suite end-to-end:

```powershell
npm run test:all
```
