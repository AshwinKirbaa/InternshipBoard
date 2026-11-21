# Responsive Internship Board Design

## Intent

Build a polished, public-deployment-ready internship discovery experience for students and early-career applicants. The product should make a varied set of opportunities easy to search and compare on any common viewport, without frameworks or misleading application flows.

## Goals

- A professional, memorable search workspace that remains straightforward to operate.
- Reusable sample data with robust rendering and graceful missing-field handling.
- Combined real-time keyword search and domain filtering.
- Complete loading, empty, and recoverable error states.
- Keyboard, screen-reader, reduced-motion, touch, and responsive support.
- Lightweight automated logic tests and inspected browser screenshots.

## Non-goals

- Accounts, saved internships, application tracking, or an in-product application form.
- Backend services, live job feeds, or invented job-specific URLs.
- A framework, build system, or dependency-heavy component library.

## Constraints

Use only HTML, CSS, and vanilla JavaScript. The site must work as static files, avoid horizontal overflow at the five specified viewports, and use sample data because no seed was supplied.

## Approaches

1. A dense directory table would maximize raw comparison speed but becomes awkward on phones and underserves descriptions.
2. An editorial opportunity bulletin would be visually distinctive but would weaken familiar search and filter affordances.
3. A task-focused search workspace combines a strong query surface, filter chips/select, result status, and responsive opportunity cards. This is the selected approach because it balances fast scanning, accessibility, and mobile behavior.

## Experience Design

The first viewport opens with a compact dark-blue navigation strip and a broad pale-blue search canvas. The headline “Find Your Next Internship” sits beside a small, honest sample-data summary. A prominent labeled search field and action button lead directly into results. Below, a sticky-feeling filter surface (without fragile CSS stickiness) keeps domain selection, result count, and reset action together.

The result grid uses variable information hierarchy rather than identical decorative tiles: title and company lead; location, work mode, and duration form a compact metadata row; domain is a colored classification label; stipend is visually emphasized only when present. Cards become one column on mobile, two on tablet/laptop, and three on wide desktop. The signature move is a fine blue “route line” connecting the hero search to the results heading, suggesting a direct path from intent to opportunity without becoming decorative chrome.

States occupy the same results region. Loading uses semantic status text and restrained skeletons. Empty state uses an authored geometric search icon, a direct recovery message, and a working clear button. Error state names the problem and offers retry. Malformed records are skipped individually; a fully unusable collection becomes the recoverable error state.

## Data and Behavior

`js/data.js` exports sample internship records and an asynchronous loader. `js/app.js` owns normalization, filtering, safe card construction, state rendering, result announcements, mobile navigation, and event binding. Search normalizes case and surrounding/duplicate whitespace and matches title, company, location, domain, description, and keyword arrays. Domain and query conditions are applied together.

Application actions are real anchors to public employer career pages with `target="_blank"` and `rel="noopener noreferrer"`. A missing application URL renders a disabled unavailable action rather than a fake destination.

## Visual System

The page uses a cool career-desk palette: ink navy, bright professional blue, mist-blue surfaces, white cards, and restrained green for available stipend highlights. Typography uses a local system sans stack for instant static-site loading. Rounded corners stay between 12–16px, elevation uses soft offset shadows without redundant borders, and selection, caret, scrollbar, hover, active, and focus states are themed. Motion is limited to the mobile menu and card-list refresh, disabled under `prefers-reduced-motion`.

## Testing

Node’s built-in test runner verifies normalization, cross-field search, combined domain filtering, malformed record rejection, missing optional values, and URL validation. Browser verification covers interactions, keyboard flow, console errors, horizontal overflow, and screenshots at desktop, tablet, mobile, filtered, and empty states.

## Builder Decisions

No third-party fonts or icon libraries are required, avoiding network dependencies. Sample records are labeled in the UI and documentation. Public company careers pages provide truthful meaningful Apply actions while avoiding claims that a particular role remains open.
