import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('HTML exposes required landmarks, labels, controls, and live status', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const fragment of [
    '<header', '<nav', '<main', '<footer',
    'for="search-input"', 'id="search-input"',
    'for="domain-filter"', 'id="domain-filter"',
    'for="mode-filter"', 'id="mode-filter"',
    'for="skill-filter"', 'id="skill-filter"',
    'id="clear-filters"', 'id="results-grid"',
    'id="results-status"', 'role="status"',
    'id="retry-button"', 'id="empty-clear-button"',
    'aria-controls="primary-navigation"',
  ]) assert.ok(html.includes(fragment), `missing ${fragment}`);
});

test('application rendering exposes skills and openings without unsupported application actions', async () => {
  const source = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  for (const fragment of [
    '.textContent =',
    "'skill-list'",
    "'openings-count'",
    'renderEmptyState',
    'renderErrorState',
    'renderLoadingState',
  ]) assert.ok(source.includes(fragment), `missing ${fragment}`);
  assert.equal(source.includes("'apply-button'"), false, 'seed records do not support application actions');
  assert.equal(source.includes('innerHTML'), false, 'rendering must avoid innerHTML with record data');
});

test('stylesheet covers accessibility, responsive breakpoints, and application states', async () => {
  const css = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
  for (const fragment of [
    ':focus-visible',
    '@media (prefers-reduced-motion: reduce)',
    '@media (min-width: 48rem)',
    '@media (min-width: 75rem)',
    'overflow-x: hidden',
    '.loading-panel',
    '.error-panel',
    '.state-panel',
    '.results-grid',
    '.primary-nav.is-open',
  ]) assert.ok(css.includes(fragment), `missing ${fragment}`);
});
