# Internship Board

Internship Board is a responsive, accessible internship discovery website built for Milestone 2. It uses EdVyro’s supplied fictional internship seed so students can search roles, compare skills and openings, and filter the records on any screen size.

## Features

- Real-time search across title, location, domain, work mode, and skills
- Domain, work-mode, and skill filters that combine with the search query
- All five records from the official EdVyro internship seed
- Responsive one-, two-, and three-column layouts
- Loading, empty, and recoverable error states
- Honest handling of source data with no invented application links
- Responsive keyboard-accessible navigation
- Graceful handling of missing optional fields and malformed records

> **Data note:** These are fictional records supplied by EdVyro for this milestone. The source does not provide company names or application links, so the interface does not invent them.

## Technology stack

- Semantic HTML5
- Mobile-first CSS3
- Vanilla JavaScript ES modules
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

3. Open the local address printed in the terminal (usually `http://localhost:3000`).

You can also use any static-file server, such as VS Code Live Server. Opening `index.html` directly may work in some browsers, but a local server is recommended because the application uses ES modules.

## Search and filtering

Typing in the search field updates results immediately. Search is case-insensitive, trims extra whitespace, and matches title, location, domain, work mode, and skills. Domain, mode, and skill filters intersect with the current query. Use **Clear filters** in the toolbar or empty state to restore every listing.

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

The project is a static site. Upload the repository root to GitHub Pages, Netlify, Render Static Sites, Vercel, or any web server. No environment variables or build command are required; use the repository root as the publish directory.

## Screenshots

Verified screenshots are stored in `reports/screenshots/` for desktop, tablet, mobile, combined search/filter results, and the empty state.
