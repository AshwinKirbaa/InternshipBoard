# EdVyro Compliance Pass Implementation Plan

**Goal:** Align the internship board with EdVyro’s supplied record seed and improve submission evidence without expanding beyond the milestone.

**Architecture:** Preserve the static HTML/CSS/vanilla-JavaScript application. Replace demonstration records with the official five-record schema, extend the pure filter function with mode and skill inputs, then adapt the renderer and responsive layout around skills and openings.

## Tasks

1. Update failing tests for the EdVyro record schema, cross-field search, and combined domain/mode/skill filters.
2. Replace the data source and normalization logic, then make the logic suite pass.
3. Update controls, cards, summary copy, and mobile composition.
4. Strengthen browser QA and package scripts, regenerate screenshots, and update documentation.
5. Run unit and browser verification and visually inspect the screenshots.
