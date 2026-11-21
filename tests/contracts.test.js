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

test('hero and results omit the decorative status eyebrow and connector', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
  const source = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

  assert.equal(html.includes('sample-note'), false, 'live-status eyebrow should be removed');
  assert.equal(css.includes('.sample-note'), false, 'live-status eyebrow styles should be removed');
  assert.equal(html.includes('route-line'), false, 'results connector should be removed');
  assert.equal(css.includes('.route-line'), false, 'results connector styles should be removed');
  assert.equal(source.includes('data-source-label'), false, 'script should not reference the removed status label');
  assert.ok(html.includes('summary-disclosure'), 'official-source disclosure should remain');
});

test('internship details page exposes an accessible record view and return path', async () => {
  const html = await readFile(new URL('../internship.html', import.meta.url), 'utf8');
  for (const fragment of ['id="detail-title"', 'id="detail-status"', 'id="detail-skills"', 'href="index.html#internships"', 'js/details.js']) {
    assert.ok(html.includes(fragment), `missing ${fragment}`);
  }
});

test('both pages declare the branded SVG favicon', async () => {
  const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const details = await readFile(new URL('../internship.html', import.meta.url), 'utf8');
  const favicon = await readFile(new URL('../assets/favicon.svg', import.meta.url), 'utf8');
  for (const html of [home, details]) assert.ok(html.includes('rel="icon" href="assets/favicon.svg" type="image/svg+xml"'));
  assert.match(favicon, /<svg[^>]+viewBox="0 0 64 64"/);
  assert.match(favicon, /<title>Internship Board<\/title>/);
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
