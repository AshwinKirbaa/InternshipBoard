# Remove Hero Ornaments

## Intent

Remove the two distracting decorative elements highlighted in the production screenshot so the hero heading and results transition remain clean at every viewport.

## Goals

- Remove the complete live-status eyebrow above the hero heading, including its green indicator, glow, and text.
- Remove the vertical connector line and circular endpoint above the internship results.
- Preserve the live-source disclosure in the summary card and preserve all search, filter, loading, and accessibility behavior.

## Non-goals

- No redesign of the hero, summary card, navigation, or results toolbar.
- No copy or data-source behavior changes.

## Approach

Delete both decorative elements from the HTML and remove their now-unused CSS rules. Repositioning was rejected because neither element adds necessary information, and keeping them would retain responsive collision risk.

## Verification

Add a contract regression asserting that the removed selectors no longer exist, run all automated tests, and inspect desktop and mobile renders for spacing and overflow.
