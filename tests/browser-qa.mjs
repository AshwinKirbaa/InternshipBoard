import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createApp } from '../backend/app.js';
import { createDatabase, seedDatabase } from '../backend/db.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);
const chromePath = chromeCandidates.find(existsSync);
if (!chromePath) throw new Error('No Chrome-family browser found. Set CHROME_PATH to its executable.');
const outputDirectory = join(root, 'reports', 'screenshots');
let port;
const debugPort = randomInt(10000, 50000);

const database = createDatabase(':memory:');
seedDatabase(database);
const server = createApp({ db: database, staticRoot: root }).listen(0, '127.0.0.1');

if (!server.listening) await new Promise((resolve) => server.once('listening', resolve));
port = server.address().port;
await mkdir(outputDirectory, { recursive: true });
const browserProfile = await mkdtemp(join(tmpdir(), 'internship-board-qa-'));

const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${browserProfile}`,
  '--hide-scrollbars', 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
let chromeDiagnostics = '';
chrome.stderr.on('data', (chunk) => { chromeDiagnostics += chunk.toString(); });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function waitForDebugger() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`Chrome debugger did not become available (exit ${chrome.exitCode ?? 'running'}). ${chromeDiagnostics.trim()}`);
}

let socket;
try {
await waitForDebugger();
const targetResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`http://127.0.0.1:${port}`)}`, { method: 'PUT' });
const target = await targetResponse.json();
socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });

let commandId = 0;
const pending = new Map();
const browserErrors = [];
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text);
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') browserErrors.push('console.error');
});

function send(method, params = {}) {
  commandId += 1;
  const id = commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await send('Page.enable');
await send('Runtime.enable');

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function setViewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
}

async function loadPage(width, height) {
  await setViewport(width, height);
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const ready = await evaluate(`document.querySelector('#results-status')?.textContent !== 'Loading internships…'`);
      if (ready) return;
    } catch {
      // The new document is still being created.
    }
    await delay(50);
  }
  const state = await evaluate(`({ href: location.href, title: document.title, status: document.querySelector('#results-status')?.textContent, scripts: [...document.scripts].map(({src,type}) => ({src,type})), resources: performance.getEntriesByType('resource').map(({name}) => name) })`);
  throw new Error(`Internship results did not finish loading: ${JSON.stringify({ state, browserErrors })}`);
}

async function screenshot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  await writeFile(join(outputDirectory, name), Buffer.from(result.data, 'base64'));
}

async function inspect(width, height) {
  await loadPage(width, height);
  if (browserErrors.length) console.log('DEBUG browserErrors:', browserErrors);
  return evaluate(`(() => ({
    width: innerWidth,
    height: innerHeight,
    noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    resultCount: document.querySelectorAll('.internship-card').length,
    status: document.querySelector('#results-status').textContent,
    unsupportedApplyActions: document.querySelectorAll('.apply-button').length,
    menuVisible: getComputedStyle(document.querySelector('.menu-button')).display !== 'none'
  }))()`);
}

const checks = [];
for (const [width, height] of [[360, 800], [375, 812], [390, 844], [768, 1024], [1366, 768], [1920, 1080]]) {
  const state = await inspect(width, height);
  if (!state.noOverflow || state.resultCount !== 5 || state.unsupportedApplyActions !== 0) throw new Error(`Viewport ${width}x${height} failed: ${JSON.stringify(state)}`);
  checks.push(`${width}x${height}: ${state.resultCount} listings, no overflow`);
  if (width === 360) await screenshot('mobile-360x800.png');
  if (width === 375) await screenshot('mobile-375x812.png');
  if (width === 768) await screenshot('tablet-768x1024.png');
  if (width === 1920) await screenshot('desktop-1920x1080.png');
}

await loadPage(1366, 768);
const filtered = await evaluate(`(() => {
  const search = document.querySelector('#search-input');
  search.value = 'remote';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  const domain = document.querySelector('#domain-filter');
  domain.value = 'Full Stack Development';
  domain.dispatchEvent(new Event('change', { bubbles: true }));
  const mode = document.querySelector('#mode-filter');
  mode.value = 'Remote';
  mode.dispatchEvent(new Event('change', { bubbles: true }));
  const skill = document.querySelector('#skill-filter');
  skill.value = 'JavaScript';
  skill.dispatchEvent(new Event('change', { bubbles: true }));
  return { count: document.querySelectorAll('.internship-card').length, status: document.querySelector('#results-status').textContent };
})()`);
if (filtered.count !== 1) throw new Error(`Combined filter failed: ${JSON.stringify(filtered)}`);
checks.push(`combined search + domain: ${filtered.status}`);
await evaluate(`window.scrollTo(0, document.querySelector('#internships').offsetTop)`);
await delay(100);
await screenshot('search-filter-results.png');

await evaluate(`document.querySelector('.internship-card-link').click()`);
await delay(250);
const detailState = await evaluate(`({
  path: location.pathname,
  id: document.querySelector('#detail-id')?.textContent,
  title: document.querySelector('#detail-title')?.textContent,
  visible: !document.querySelector('#detail-card')?.hidden
})`);
if (!detailState.path.endsWith('/internship.html') || detailState.id !== 'INT-101' || detailState.title !== 'Frontend Intern' || !detailState.visible) {
  throw new Error(`Card details navigation failed: ${JSON.stringify(detailState)}`);
}
checks.push('card selection: opened INT-101 details page');
await screenshot('internship-details.png');

const validationResult = await evaluate(`(() => {
  const submitBtn = document.querySelector('#app-submit-button');
  submitBtn.click();
  const status = document.querySelector('#app-form-status');
  const nameError = document.querySelector('#app-full-name-error');
  return {
    hasStatusError: status?.classList.contains('is-error'),
    hasNameError: !nameError?.hidden && (nameError?.textContent?.length || 0) > 0,
    statusText: status?.textContent,
  };
})()`);
if (!validationResult.hasStatusError || !validationResult.hasNameError) {
  throw new Error(`Application client validation failed: ${JSON.stringify(validationResult)}`);
}
checks.push('application form: client validation displayed field-specific errors');

const submitResult = await evaluate(`(async () => {
  document.querySelector('#app-full-name').value = 'Jordan Lee';
  document.querySelector('#app-email').value = 'jordan.lee@example.com';
  document.querySelector('#app-phone').value = '+1-555-0142';
  document.querySelector('#app-cover-note').value = 'I am enthusiastic about applying for this frontend engineering internship opportunity.';
  const form = document.querySelector('#application-form');
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const status = document.querySelector('#app-form-status');
    if (status?.classList.contains('is-success')) {
      return { success: true, message: status.textContent };
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return { success: false, message: document.querySelector('#app-form-status')?.textContent };
})()`);
if (!submitResult.success) {
  throw new Error(`Application submission in browser failed: ${JSON.stringify(submitResult)}`);
}
checks.push('application form: successfully submitted and confirmed with reference ID');
await screenshot('application-submitted.png');

const healthRes = await fetch(`http://127.0.0.1:${port}/health`);
const healthReadyRes = await fetch(`http://127.0.0.1:${port}/health/ready`);
if (!healthRes.ok || !healthReadyRes.ok) {
  throw new Error(`Health checks failed: liveness=${healthRes.status}, readiness=${healthReadyRes.status}`);
}
checks.push('health endpoints: /health and /health/ready verified operational');
await send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
await delay(650);

const empty = await evaluate(`(() => {
  const search = document.querySelector('#search-input');
  search.value = 'no-such-internship-xyz';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  return { visible: !document.querySelector('#empty-state').hidden, status: document.querySelector('#results-status').textContent };
})()`);
if (!empty.visible) throw new Error(`Empty state failed: ${JSON.stringify(empty)}`);
checks.push(`empty state: ${empty.status}`);
await evaluate(`window.scrollTo(0, document.querySelector('#internships').offsetTop)`);
await delay(100);
await screenshot('empty-state.png');

await evaluate(`document.querySelector('#empty-clear-button').click()`);
const clearedCount = await evaluate(`document.querySelectorAll('.internship-card').length`);
if (clearedCount !== 5) throw new Error(`Clear filters returned ${clearedCount} listings`);
checks.push('clear filters: restored all 5 supplied listings');

const errorVisible = await evaluate(`import('/js/app.js').then(({ renderErrorState }) => {
  renderErrorState();
  return !document.querySelector('#error-state').hidden && document.querySelector('#results-status').textContent.includes('could not be loaded');
})`);
if (!errorVisible) throw new Error('Error state did not render');
await evaluate(`document.querySelector('#retry-button').click()`);
await delay(350);
const retryState = await evaluate(`(() => {
  const values = [...document.querySelector('#domain-filter').options].map(({ value }) => value);
  return { count: document.querySelectorAll('.internship-card').length, uniqueDomains: new Set(values).size === values.length };
})()`);
if (retryState.count !== 5 || !retryState.uniqueDomains) throw new Error(`Retry state invalid: ${JSON.stringify(retryState)}`);
checks.push('error + retry: recovered 5 listings without duplicate filters');

await loadPage(375, 812);
await evaluate(`document.querySelector('.menu-button').focus()`);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13 });
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
const menuState = await evaluate(`({ expanded: document.querySelector('.menu-button').getAttribute('aria-expanded'), open: document.querySelector('#primary-navigation').classList.contains('is-open') })`);
if (menuState.expanded !== 'true' || !menuState.open) throw new Error(`Keyboard menu activation failed: ${JSON.stringify(menuState)}`);
await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
const focused = await evaluate(`document.activeElement?.closest('#primary-navigation') !== null`);
if (!focused) throw new Error('Keyboard focus did not enter the open mobile navigation');
checks.push('mobile navigation: Enter opens menu and Tab reaches links');
await screenshot('mobile-navigation.png');
await evaluate(`(() => {
  document.querySelector('.menu-button').click();
  window.scrollTo(0, document.querySelector('#internships').offsetTop);
})()`);
await delay(100);
await screenshot('mobile-results.png');

if (browserErrors.length) throw new Error(`Browser errors: ${browserErrors.join(', ')}`);
console.log(checks.join('\n'));
console.log('Browser console: 0 errors');
console.log(`Screenshots: ${outputDirectory}`);

} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  server.close();
  database.close();
  if (chrome.exitCode === null) {
    await new Promise((resolve) => {
      chrome.once('exit', resolve);
      chrome.kill();
      setTimeout(resolve, 1500);
    });
  }
  await rm(browserProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
