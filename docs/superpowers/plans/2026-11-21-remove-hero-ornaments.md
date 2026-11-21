# Remove Hero Ornaments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the overlapping live-status eyebrow, green indicator, and results connector without changing application behavior.

**Architecture:** Delete the two presentation-only nodes from `index.html`, delete their unused selectors from `css/styles.css`, and pin the absence with a markup/style contract test. Existing live-source information remains in the summary card.

**Tech Stack:** Semantic HTML, CSS, Node.js built-in test runner, headless Chrome QA.

**Spec:** `docs/superpowers/specs/2026-11-21-remove-hero-ornaments-design.md`

## Global Constraints

- Preserve all search, filtering, loading, accessibility, and live-data behavior.
- Do not redesign adjacent hero or results components.
- Remove unused markup and CSS rather than hiding it.

## Review Focus

- Desktop hero: heading begins cleanly with no overlapping status content.
- Mobile hero: removal leaves no unexpected blank gap.
- Results transition: no vertical line or circular endpoint remains.
- Source disclosure: summary card still identifies official employer boards.
- Accessibility: landmark and heading structure remain unchanged.

---

### Task 1: Remove the decorative status and connector

**Files:**
- Modify: `tests/contracts.test.js`
- Modify: `index.html`
- Modify: `css/styles.css`

**Interfaces:**
- Consumes: Existing static DOM and stylesheet selectors.
- Produces: Hero and results markup with no `.sample-note` or `.route-line` elements or rules.

- [ ] **Step 1: Write the failing regression test**

Add a contract test that asserts `index.html` and `css/styles.css` contain neither `sample-note` nor `route-line`, while `summary-disclosure` remains present.

- [ ] **Step 2: Run the contract test and verify RED**

Run: `node --test tests/contracts.test.js`

Expected: FAIL because both unwanted selectors still exist.

- [ ] **Step 3: Remove the unused markup and styles**

Delete the `.sample-note` paragraph from `index.html`, the `.route-line` node from the results section, and all matching CSS rules and pseudo-element rules.

- [ ] **Step 4: Verify GREEN and responsive rendering**

Run: `npm test`

Run: `npm run test:browser`

Expected: all tests pass, supported viewports have no overflow, and browser console has zero errors.

- [ ] **Step 5: Commit and deploy**

Commit the spec, plan, tests, HTML, and CSS; push `main`; redeploy the Vercel static files; visually verify production at desktop and mobile widths.
