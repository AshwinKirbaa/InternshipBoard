# Task 4 Capstone QA & Production Readiness Report

**Project:** Internship Board  
**Milestone:** EdVyro Full Stack Development Task 4 — “Production-Ready Capstone”  
**Date of Audit:** November 22, 2026  
**Audit Environment:** Windows 11, Node.js v24.21.0, Headless Chrome 131+ (DevTools Protocol), SQLite (`node:sqlite`)  
**Single Public Proof Link:** <https://github.com/AshwinKirbaa/InternshipBoard>

---

## 1. Executive Summary

This report documents the quality, security, responsiveness, accessibility, and observability audit completed for the Internship Board capstone milestone. All Task 4 requirements have been implemented and validated through reproducible automated tests, headless browser verification, and manual journey validation.

### Key Verification Metrics

| Category | Requirement | Result | Evidence |
| :--- | :--- | :--- | :--- |
| **Automated Test Suite** | 100% pass on unit, API, schema, validation, and contract tests | ✅ **74 / 74 Passing** | `npm test` (0 failures, 0 skips) |
| **Browser QA Suite** | 6 viewport tests, user journey, navigation, console errors | ✅ **15 / 15 Passing** | `npm run test:browser` (0 console errors) |
| **Liveness Health Check** | Lightweight `/health` and `/health/live` check | ✅ **Verified (200 OK)** | Automated test + browser QA check |
| **Readiness Health Check** | Database accessibility check on `/health/ready` and `/ready` | ✅ **Verified (200/503)** | Healthy DB (200), closed DB (503) |
| **Structured Observability**| JSON logs with correlation ID, method, route, status, duration | ✅ **Verified** | Correlation ID header + structured logs |
| **Data Privacy & Redaction**| No PII, bodies, secrets, or stack traces in logs | ✅ **Verified** | Automated redaction assertion |
| **Accessibility Audit** | WCAG 2.1 AA landmarks, skip links, focus states, ARIA | ✅ **Verified** | Semantic HTML, live regions, tab focus |
| **Responsive Design** | No horizontal overflow from 360px mobile to 1920px desktop | ✅ **Verified** | 6 distinct viewport tests passing |
| **Defense-in-Depth** | Security headers, CSP, rate limiting, parameterized SQL, 100 KB limit | ✅ **Verified** | Security headers + rate limiter tests |

---

## 2. Complete User Journey Verification

Every step of the user journey was exercised on both desktop and mobile viewports:

1. **Browse, Search, and Filter:**
   - **Browsing:** Loaded 5 supplied seed records with real source badges and normalized attributes (openings, skills, location, mode).
   - **Search:** Case-insensitive search on title, company, location, domain, mode, and skills.
   - **Combined Filters:** Multi-criteria intersection of search query (`remote`), domain (`Full Stack Development`), work mode (`Remote`), and skill (`JavaScript`) returned exactly 1 matching record (`INT-101`).
2. **Open Record Details:**
   - Selecting an internship card opens `internship.html?id=INT-101`.
   - Title, domain badge, location, work mode, openings count, skill tags, and provenance disclosures render correctly.
3. **Application Submission Flow:**
   - **Client-Side Validation:** Submitting an empty or incomplete application displays field-specific error messages beneath each invalid input, updates the status message, and shifts focus to the first invalid field.
   - **Pending / In-Flight State:** While the submission request is in-flight, the submit button is disabled and changes text to `Submitting application…`, and the status live region announces the pending submission.
   - **Successful Submission:** Valid submissions return `201 Created` with a unique UUID reference ID (`id`, `internshipId`, `submittedAt`). The form displays a green success confirmation with the reference ID and clears sensitive applicant inputs while retaining the `internshipId`.
   - **Error Recovery:** In network error or server validation scenarios, the applicant's input values are preserved so the user does not have to retype their details.
   - **Closed Application State:** When `applicationsOpen: false`, all form inputs are disabled, an alert notice informs the user that applications are closed, and direct API submissions are rejected with `409 Conflict`.
4. **Empty and Error State Recovery:**
   - Searching for non-existent criteria (`no-such-internship-xyz`) displays an accessible empty state with a "Clear search and filters" button.
   - Clicking the clear button immediately resets filters and restores all listings.
   - Controlled error states provide a "Retry" button that recovers data without duplicating filter options.

---

## 3. Observability and Health Architecture

### Structured Request Logging

The Express application implements lightweight, dependency-free structured logging emitting single-line JSON objects to standard output:

```json
{
  "timestamp": "2026-11-22T04:00:56.120Z",
  "requestId": "c1f7a048-b484-48f8-b320-cf916e7a2b91",
  "method": "POST",
  "route": "/api/applications",
  "status": 201,
  "durationMs": 14.85
}
```

#### Privacy & Security Guarantees
- **No Request Bodies:** Application submission payloads are never logged.
- **No Personal Data:** Applicant names, email addresses, phone numbers, and cover notes are excluded from logging.
- **No URL Secrets:** Query parameters are stripped from the logged `route` path.
- **No Stack Traces:** Operational errors log level, code, status, route, and method; internal stack traces are suppressed.

### Correlation ID (`X-Request-Id`)

- Every incoming HTTP request is assigned a correlation ID.
- If the incoming client or proxy includes an `X-Request-Id` header, that ID is validated and propagated. If omitted, a fresh UUID is generated using Node.js's built-in `crypto.randomUUID()`.
- The correlation ID is attached to the response via the `X-Request-Id` HTTP header.

### Health Endpoints

| Endpoint | Method | Purpose | Healthy Response | Degraded Response |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | Lightweight Liveness | `200 OK` `{"status":"ok","service":"internship-board-api"}` | Server down |
| `/health/live` | `GET` | Liveness Alias | `200 OK` `{"status":"ok","service":"internship-board-api"}` | Server down |
| `/health/ready` | `GET` | Readiness & DB Check | `200 OK` `{"status":"ready","service":"internship-board-api","checks":{"database":"ok"}}` | `503 Service Unavailable` `{"status":"unavailable",...}` |
| `/ready` | `GET` | Readiness Alias | `200 OK` `{"status":"ready","service":"internship-board-api","checks":{"database":"ok"}}` | `503 Service Unavailable` `{"status":"unavailable",...}` |

---

## 4. Quality Audit Results

### Accessibility (a11y)
- **Landmarks:** Distinct `<header>`, `<main id="top">`, `<aside aria-label="...">`, `<section>`, `<nav>`, and `<footer` landmarks provide full screen-reader navigation.
- **Skip Links:** Functional skip links on both `index.html` and `internship.html` allow keyboard users to bypass header navigation.
- **Form Error Association:** Form controls use `aria-describedby="app-[field]-error"`, `aria-invalid="true"`, and `role="alert"` live regions for screen readers.
- **Focus Rings:** High-contrast `outline: 3px solid #0056b3` focus rings with `outline-offset: 2px` across all interactive elements.
- **Keyboard Mobile Drawer:** Keyboard focus enters the mobile navigation drawer upon pressing Enter on the menu button, and Tab traverses all navigation items.

### Responsive Behavior Matrix

Tested across 6 device viewport profiles:

| Viewport | Device Profile | Listings Rendered | Horizontal Overflow | Layout Grid |
| :--- | :--- | :--- | :--- | :--- |
| **360 × 800** | Small Smartphone | 5 listings | 0 px (None) | 1 column stacked |
| **375 × 812** | Standard Smartphone | 5 listings | 0 px (None) | 1 column stacked |
| **390 × 844** | Modern Smartphone | 5 listings | 0 px (None) | 1 column stacked |
| **768 × 1024** | Tablet / iPad | 5 listings | 0 px (None) | 2 column grid |
| **1366 × 768** | Small Laptop | 5 listings | 0 px (None) | 3 column grid |
| **1920 × 1080** | Full HD Desktop | 5 listings | 0 px (None) | 3 column grid |

### Security & Defense-in-Depth

- **Security Response Headers:**
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
  - `x-powered-by` header disabled.
- **Rate Limiting:** In-memory per-IP rate limiter restricts application submissions to 5 per 15-minute window with `429 Too Many Requests` and `Retry-After` header. Automatic pruning evicts expired IP records every 5 minutes.
- **Body Size Caps:** JSON parser enforces a 100 KB request size limit (`413 Payload Too Large`).
- **SQL Injection Prevention:** SQLite parameterized prepared statements (`?` placeholders) used exclusively.
- **Input Whitelisting:** Strict property whitelisting rejects unrecognized fields with `422 Unprocessable Content`.

---

## 5. Visual Evidence and Screenshot Artifacts

All screenshots are stored in `reports/screenshots/` and regenerated during `npm run test:browser`:

| Screenshot File | Resolution / View | Description |
| :--- | :--- | :--- |
| `reports/screenshots/desktop-1920x1080.png` | 1920 × 1080 | Desktop 3-column layout with hero and filters |
| `reports/screenshots/tablet-768x1024.png` | 768 × 1024 | Tablet 2-column layout |
| `reports/screenshots/mobile-375x812.png` | 375 × 812 | Standard mobile layout |
| `reports/screenshots/mobile-360x800.png` | 360 × 800 | Small mobile viewport (360px portfolio width) |
| `reports/screenshots/mobile-navigation.png` | 375 × 812 | Open mobile navigation drawer |
| `reports/screenshots/mobile-results.png` | 375 × 812 | Mobile search and filter toolbar |
| `reports/screenshots/search-filter-results.png`| 1366 × 768 | Active search query + domain/mode/skill filters |
| `reports/screenshots/empty-state.png` | 1366 × 768 | Empty search state with clear button |
| `reports/screenshots/internship-details.png` | 1366 × 768 | Detail view with role data and application form |
| `reports/screenshots/application-submitted.png` | 1366 × 768 | Confirmed submission with Reference ID |

---

## 6. Known Limitations & Production Notes

1. **In-Memory Rate Limiting:** The built-in rate limiter runs in process memory, making it zero-dependency and ideal for single-instance deployments. For horizontal multi-instance scaling behind a load balancer, back the rate limiter with a distributed store such as Redis.
2. **SQLite Disk Persistence on Cloud Hosts:** SQLite stores data on local disk. On container hosts with ephemeral filesystems (e.g., Render free tier), container restarts re-initialize from seeded data unless a persistent volume mount is configured.
3. **Live Job Feeds Availability:** Live listings aggregate official Greenhouse, Lever, and Ashby postings. If remote provider APIs become temporarily unreachable, the service falls back gracefully to the persistent SQLite collection and supplied sample records without crashing.
