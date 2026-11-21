# Live Internship Platform Implementation Plan

**Goal:** Replace the sample-only board with live, attributable internship openings using a Render API and Vercel frontend while preserving a reliable EdVyro fallback.

**Architecture:** A dependency-free Node.js service on Render fetches Remotive’s permitted public API, filters internship/trainee/apprentice/graduate openings, normalizes and deduplicates them, caches successful responses for six hours, and exposes `/api/internships` plus `/health`. The static frontend uses a Vercel rewrite to call that service from the same origin and falls back to the supplied EdVyro records on provider failure.

## Tasks

1. Write failing tests for provider normalization, internship matching, deduplication, URL safety, and fallback behavior.
2. Implement the Render API, cache headers, timeouts, health endpoint, CORS allowlist, and `render.yaml` service definition.
3. Adapt frontend records/cards/filters/details for live and sample schemas, source attribution, publication date, and original-opening links.
4. Extend unit, contract, and browser QA for live/fallback states and safe external actions.
5. Deploy and verify the Render API.
6. Add the Vercel rewrite/configuration, deploy production, and run public end-to-end verification.
