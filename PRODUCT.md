# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Plain static HTML, CSS, and vanilla JavaScript. No frontend or CSS frameworks.

## Users

Students and early-career applicants browsing internships across phones, tablets, and desktop computers.

## Product Purpose

Internship Board helps students search, filter, and compare the fictional internship records supplied for the EdVyro milestone. Success means a reviewer can verify the required interactions and a student can narrow the records without friction.

## Positioning

A focused, accessible opportunity board that makes the important comparison details visible at a glance while keeping search and domain filtering fast on every screen size.

## Operating Context

Visitors scan multiple opportunities, compare domain, location, work mode, duration, and stipend, then follow an external application link. They may be using a keyboard, a narrow mobile viewport, or reduced-motion settings.

## Capabilities and Constraints

- Search title, location, domain, work mode, and skills in real time.
- Combine free-text search with domain, mode, and skill filters and clear all controls.
- Render cards from reusable data and tolerate malformed or incomplete records.
- Provide useful loading, empty, and error states with recovery actions.
- Do not invent application destinations absent from the supplied seed.
- Meet the supplied accessibility and responsive viewport requirements.

## Evidence on Hand

The EdVyro seed supplies five fictional records with IDs, titles, domains, modes, locations, skills, and opening counts. It supplies no company names, descriptions, stipends, durations, or application URLs; the product must not fabricate those fields.

## Product Principles

- Make opportunities fast to scan and compare.
- Keep every interaction usable by keyboard and touch.
- Communicate missing data and failures honestly.
- Prefer resilient, dependency-free behavior over ornamental complexity.

## Accessibility & Inclusion

Semantic structure, explicit labels, logical focus order, visible focus, sufficient contrast, reduced-motion support, touch-friendly targets, and non-visual status announcements are mandatory.
