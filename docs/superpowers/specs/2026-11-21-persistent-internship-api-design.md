# Persistent Internship API Design

Upgrade the existing Internship Board into one full-stack submission that satisfies EdVyro Full Stack Development Task 2. Keep the existing interface and add an Express + SQLite API as its persistent source of internship records.

## Goals and constraints

- Provide paginated list, detail, create, replace/update, and delete endpoints.
- Validate request data and return consistent JSON responses and status codes.
- Persist records in SQLite and seed the five supplied EdVyro JSON internships.
- Preserve the responsive frontend and live-provider capability where practical.
- Use Node.js 22+, Express, and a self-contained SQLite database.
- Do not add authentication, application submission, an admin UI, or a redesign.

## Approach

Use Express with a combined internship model: `id`, `title`, `domain`, `mode`, `location`, `skills`, `openings`, `durationWeeks`, and `applicationsOpen`. This preserves fields from both supplied data files and remains compatible with the frontend. Copying the SQL schema exactly would lose JSON/frontend fields; PostgreSQL would add unnecessary setup.

A repository module owns SQLite initialization and queries, validation remains independent of HTTP handling, and the Express app owns routing and response envelopes. Lists return `data` and pagination metadata; single records return `data`; deletion returns 204. Errors use `{ "error": { "code", "message", "details"? } }`, with 400 for bad requests, 404 for missing records, 409 for duplicate IDs, and 422 for invalid internship data.

The database is initialized from an idempotent schema. A seed command resets and inserts the five supplied records. Tests use isolated temporary databases and real HTTP requests to an ephemeral server.
