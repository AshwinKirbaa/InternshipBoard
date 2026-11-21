# Internship Board

Internship Board is a responsive, accessible internship discovery website built for Milestone 2. It combines current internship openings from official employer job boards with EdVyro's five supplied records as a resilient fallback.

## Features

- Real-time search across title, location, domain, work mode, and skills
- Domain, work-mode, and skill filters that combine with the search query
- Current openings from seven official employer Greenhouse boards
- External live cards link directly to the employer's original posting
- All five EdVyro seed records remain available when the live API is unavailable
- Selectable fallback cards have an internal, shareable details page
- Responsive one-, two-, and three-column layouts
- Loading, empty, and recoverable error states
- Honest source labels and no invented application links
- Responsive keyboard-accessible navigation
- Graceful handling of missing optional fields and malformed records

> **Data note:** Live listings come from public employer Greenhouse job-board APIs and can change at any time. If every provider is unavailable, the interface clearly switches to EdVyro's fictional five-record sample instead of displaying stale or invented openings.

## Technology stack

- Semantic HTML5
- Mobile-first CSS3
- Vanilla JavaScript ES modules
- Dependency-free Node.js HTTP API
- Node.js built-in test runner
- Headless Google Chrome for browser QA and screenshots

No frontend framework, CSS framework, runtime dependency, or build step is used.

## Project structure

```text
.
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   └── data.js
├── backend/
│   ├── provider.js
│   └── server.js
├── tests/
│   ├── app.test.js
│   ├── contracts.test.js
│   └── browser-qa.mjs
├── reports/screenshots/
├── docs/superpowers/
├── PRODUCT.md
├── package.json
└── README.md
```

## Run locally

You need Node.js 22 or newer to run both the unit and browser QA scripts. There are no packages to install.

1. Open a terminal in the project folder.
2. Start a local static server:

   ```powershell
   npx serve .
   ```

3. In a second terminal, start the live API with `npm run start:api`.
4. Open the local address printed by the static server (usually `http://localhost:3000`).

You can also use any static-file server, such as VS Code Live Server. Opening `index.html` directly may work in some browsers, but a local server is recommended because the application uses ES modules.

## Search and filtering

Typing in the search field updates results immediately. Search is case-insensitive, trims extra whitespace, and matches title, location, domain, work mode, and skills. Domain, mode, and skill filters intersect with the current query. Use **Clear filters** in the toolbar or empty state to restore every listing.

Selecting a live internship opens the original employer posting in a new tab. A supplied fallback record opens its dedicated internal details page, which identifies the listing as fictional rather than inventing an external application destination.

## Accessibility

- Semantic header, navigation, main, sections, articles, and footer
- Explicit labels for search and domain controls
- Live result-count announcements and a dedicated alert for load failures
- Skip link, logical source order, and visible high-contrast focus rings
- Touch targets sized for mobile use
- Plain-language labels for every search and filter control
- Sufficient text contrast and non-color status communication
- `prefers-reduced-motion` support

## Testing

Run the automated logic and markup/style contract tests:

```powershell
npm test
```

Run browser QA and regenerate screenshots (Windows with Google Chrome installed at its default location):

```powershell
node tests/browser-qa.mjs
```

Or run both suites together:

```powershell
npm run test:all
```

The browser script verifies the EdVyro 360px portfolio width plus all five project viewports, the official record count, horizontal overflow, absence of unsupported application actions, four-way combined filtering, empty state, retry behavior, unique filter options, mobile keyboard navigation, and browser console errors.

## Deployment

The frontend is deployed as a static Vercel project. Requests under `/api/*` are rewritten to the Render web service. The included `render.yaml` defines the dependency-free Node API, its health check, runtime, and allowed browser origins.

Render commands:

- Build: `npm install --ignore-scripts`
- Start: `npm run start:api`
- Health check: `/health`

Set `ALLOWED_ORIGINS` to the final Vercel production origin plus the local development origins before exposing the Render API directly to browsers.

## Screenshots

Verified screenshots are stored in `reports/screenshots/` for desktop, tablet, mobile, combined search/filter results, and the empty state.
