# Live Multi-Provider Internships Design

## Intent

Restore live internship discovery without weakening the persistent CRUD milestone. Students should see current, attributable openings from official employer job-board feeds, while reviewers can continue to exercise the existing SQLite API and its five supplied records.

## Goals

- Aggregate internship-like openings from official Greenhouse, Lever, and Ashby feeds.
- Normalize every live result to the frontend's existing internship shape and retain its original application URL and source.
- Deduplicate results, tolerate partial provider failure, cap upstream work, and cache successful collections.
- Keep `GET /api/internships` and all CRUD behavior, validation, pagination, and seed records unchanged.
- Fall back to persistent records when no live provider returns usable openings.

## Non-goals and anti-goals

- Do not scrape LinkedIn, Indeed, Internshala, or other protected HTML pages.
- Do not write volatile live jobs into SQLite or allow them through persistent CRUD routes.
- Do not present fabricated listings or hide where a listing came from.

## Constraints

- Node.js 22+, Express 5, and built-in `fetch`; no browser automation or scraper dependency.
- Provider failures and malformed payloads must not take down the API.
- Existing internship fields and validation constraints remain compatible.

## Approaches

1. **Official multi-provider feeds (selected):** Greenhouse, Lever, and Ashby adapters behind one aggregator. Broad, attributable, and stable enough for production.
2. **Greenhouse-only restoration:** smallest change, but too narrow for the requested source coverage.
3. **Unrestricted HTML scraping:** widest theoretical reach, but brittle, hostile to provider terms, and likely to fail in production.

## Design

Provider adapters fetch official public JSON endpoints and normalize jobs to the existing live-record shape. A service runs providers concurrently, keeps successful results when another source fails, deduplicates by canonical application URL, sorts newest first, and caches a successful non-empty response for a bounded interval. Express exposes this as `GET /api/live-internships`; the frontend requests that endpoint first and uses the unchanged paginated persistent endpoint only when the live collection is unavailable or empty. Live cards continue to open their official source URL, while persistent cards continue to use the local detail page.

