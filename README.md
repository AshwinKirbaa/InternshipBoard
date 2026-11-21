# Internship Board

Internship Board is a responsive full-stack portfolio project. Its Express REST API stores internship records in SQLite with validation, pagination, and complete CRUD operations; the accessible frontend reads those records and retains EdVyro's five supplied records as an offline fallback.

## Features

- Persistent SQLite records seeded from EdVyro's five supplied internships
- List, detail, create, replace, update, and delete API endpoints
- Validated inputs, predictable status codes, and consistent JSON errors
- Paginated list responses
- Search plus domain, work-mode, and skill filters
- Internal record detail pages backed by the API
- Responsive one-, two-, and three-column layouts
- Loading, empty, fallback, and recoverable error states
- Keyboard-accessible navigation and visible focus states

> **Data note:** The seeded internships are fictional records supplied for this portfolio exercise. The repository still includes Greenhouse normalization code from the earlier frontend milestone, but persistent CRUD records are now the application's primary source.

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
| `GET` | `/health` | Service health | `200` |
| `GET` | `/api/internships?page=1&limit=10` | Paginated list | `200` |
| `GET` | `/api/internships/:id` | Record detail | `200` |
| `POST` | `/api/internships` | Create a record | `201` |
| `PUT` | `/api/internships/:id` | Replace a record | `200` |
| `PATCH` | `/api/internships/:id` | Update selected fields | `200` |
| `DELETE` | `/api/internships/:id` | Delete a record | `204` |

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

SQLite persists locally. The included Render Blueprint uses a 1 GB persistent disk mounted at `/var/data` and a `DATABASE_PATH` on that disk. This requires an eligible paid Render plan; review current pricing before applying the Blueprint.

Current project URLs from the earlier milestone:

- Frontend: <https://internship-board-nu.vercel.app/>
- API health: <https://internship-board-api-3497.onrender.com/health>
