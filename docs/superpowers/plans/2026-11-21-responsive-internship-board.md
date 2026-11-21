# Responsive Internship Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, test, document, and visually verify a responsive, accessible vanilla-JavaScript internship board.

**Architecture:** A static semantic HTML shell loads reusable sample records from `js/data.js` and pure filtering/validation helpers plus DOM orchestration from `js/app.js`. CSS is mobile-first; Node’s built-in test runner exercises the exported pure logic without adding dependencies.

**Tech Stack:** HTML5, CSS3, ES modules, vanilla JavaScript, Node.js built-in test runner, browser screenshot tooling.

**Spec:** `docs/superpowers/specs/2026-11-21-responsive-internship-board-design.md`

## Global Constraints

- Use plain HTML, CSS, and vanilla JavaScript only.
- All cards must be generated from reusable sample data.
- Search and domain filtering must combine, handle malformed records, and expose loading/empty/error states.
- Support keyboard use, visible focus, semantic labels/status, sufficient contrast, and reduced motion.
- Verify 375×812, 390×844, 768×1024, 1366×768, and 1920×1080 without horizontal overflow.

## Review Focus

- Whitespace-only and mixed-case searches return the correct set.
- Missing optional stipend or malformed records never crash rendering.
- Search and domain filters intersect rather than replace each other.
- External links are valid HTTP(S) destinations with safe new-tab attributes.
- Mobile navigation and all recovery actions remain keyboard-operable.

---

### Task 1: Filtering Domain and Sample Records

**Files:**
- Create: `js/data.js`
- Create: `js/app.js`
- Create: `tests/app.test.js`
- Create: `package.json`

**Interfaces:**
- Produces: `normalizeInternship(record)`, `filterInternships(records, query, domain)`, `isSafeExternalUrl(value)`, `internships`, and `loadInternships()`.

- [ ] Write tests for whitespace/case normalization, every searchable field, combined filters, malformed records, missing stipend, and safe URLs.
- [ ] Run `npm test` and verify the test module fails because implementation exports are absent.
- [ ] Implement the minimal pure functions and realistic sample records.
- [ ] Run `npm test` and verify all logic tests pass.

### Task 2: Accessible Application Shell and Rendering

**Files:**
- Create: `index.html`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: Task 1 exports.
- Produces: semantic page regions, card/empty/error/loading renderers, filter handlers, result status announcements, and mobile navigation behavior.

- [ ] Add a DOM-contract test for required IDs, labels, landmarks, state containers, and safe application-link construction; run it red.
- [ ] Build the semantic header, hero search, filter/results area, and footer.
- [ ] Implement safe DOM rendering and all event handlers, including clear/retry/mobile-menu behavior.
- [ ] Run `npm test` and verify logic and HTML contract tests pass.

### Task 3: Responsive Visual System

**Files:**
- Create: `css/styles.css`

**Interfaces:**
- Consumes: the class and state names defined in `index.html` and `js/app.js`.
- Produces: mobile-first layout, responsive card grid/navigation, complete interactive states, and reduced-motion handling.

- [ ] Add a stylesheet contract test for required breakpoints, focus-visible, reduced motion, overflow protection, and state styles; run it red.
- [ ] Implement tokens, mobile layout, card design, navigation, states, browser surfaces, and responsive breakpoints.
- [ ] Run `npm test` and verify the stylesheet contract passes.

### Task 4: Browser QA, Screenshots, and Documentation

**Files:**
- Create: `README.md`
- Create: `reports/screenshots/*.png`
- Create: `tests/browser-qa.mjs`

**Interfaces:**
- Consumes: the complete static site.
- Produces: repeatable browser checks, required screenshots, and beginner-friendly documentation.

- [ ] Run the site locally and execute browser QA for initial rendering, field searches, domain and combined filters, clear, empty, retry/error, keyboard controls, console errors, links, and overflow at all required viewports.
- [ ] Fix each discovered issue with a failing regression test where practical, then rerun the complete suite.
- [ ] Capture and inspect desktop, tablet, mobile, filtered-results, and empty-state screenshots in `reports/screenshots/`.
- [ ] Write the README with overview, features, structure, setup/run, behavior, accessibility, testing, deployment, and sample-data disclosure.
- [ ] Run final `npm test` and browser QA, then inspect the requirement checklist and screenshot files.
