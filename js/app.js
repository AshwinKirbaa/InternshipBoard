const REQUIRED_TEXT_FIELDS = ['title', 'domain'];
const SEARCH_FIELDS = ['title', 'company', 'location', 'domain', 'mode', 'description'];

function cleanText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function isSafeExternalUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function getDetailsUrl(recordId) {
  return `internship.html?id=${encodeURIComponent(cleanText(recordId))}`;
}

export function getRecordUrl(record) {
  return record?.isLive && isSafeExternalUrl(record.sourceUrl) ? record.sourceUrl : getDetailsUrl(record?.id || '');
}

export function normalizeInternship(record) {
  if (!record || typeof record !== 'object') return null;

  const requiredValues = Object.fromEntries(REQUIRED_TEXT_FIELDS.map((field) => [field, cleanText(record[field])]));
  if (REQUIRED_TEXT_FIELDS.some((field) => !requiredValues[field])) return null;

  const normalized = {
    id: cleanText(record.id) || cleanText(record.title).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: cleanText(record.title),
    company: cleanText(record.company),
    location: cleanText(record.location) || 'Location not specified',
    domain: cleanText(record.domain) || 'Other',
    mode: cleanText(record.mode) || 'Work mode not specified',
    skills: Array.isArray(record.skills) ? record.skills.map(cleanText).filter(Boolean) : [],
    openings: Number.isInteger(record.openings) && record.openings >= 0 ? record.openings : 0,
    salary: cleanText(record.salary),
    description: cleanText(record.description),
    publishedAt: cleanText(record.publishedAt),
    source: cleanText(record.source),
    sourceUrl: isSafeExternalUrl(record.sourceUrl) ? record.sourceUrl : '',
    isLive: record.isLive === true,
  };

  return normalized;
}

export function filterInternships(records, query = '', domain = 'all', mode = 'all', skill = 'all') {
  const normalizedQuery = cleanText(query).toLocaleLowerCase();
  const normalizedDomain = cleanText(domain).toLocaleLowerCase();
  const normalizedMode = cleanText(mode).toLocaleLowerCase();
  const normalizedSkill = cleanText(skill).toLocaleLowerCase();

  return (Array.isArray(records) ? records : [])
    .map(normalizeInternship)
    .filter(Boolean)
    .filter((record) => {
      const matchesDomain = !normalizedDomain || normalizedDomain === 'all' || record.domain.toLocaleLowerCase() === normalizedDomain;
      const matchesMode = !normalizedMode || normalizedMode === 'all' || record.mode.toLocaleLowerCase() === normalizedMode;
      const matchesSkill = !normalizedSkill || normalizedSkill === 'all' || record.skills.some((item) => item.toLocaleLowerCase() === normalizedSkill);
      const searchable = [
        ...SEARCH_FIELDS.map((field) => record[field]),
        ...record.skills,
      ].join(' ').toLocaleLowerCase();
      return matchesDomain && matchesMode && matchesSkill && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createIcon(pathData) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  svg.append(path);
  return svg;
}

function createMetaItem(iconPath, text) {
  const item = createElement('li', 'meta-item');
  item.append(createIcon(iconPath), createElement('span', '', text));
  return item;
}

export function createInternshipCard(record) {
  const card = createElement('article', 'internship-card');
  card.setAttribute('aria-labelledby', `title-${record.id}`);

  const top = createElement('div', 'card-top');
  const identity = createElement('div', 'card-identity');
  const recordMark = createElement('span', 'company-mark', record.company ? record.company.slice(0, 1).toUpperCase() : record.id.replace('INT-', ''));
  const headingGroup = createElement('div');
  const title = createElement('h3', '', record.title);
  title.id = `title-${record.id}`;
  headingGroup.append(title, createElement('p', 'record-id', record.company || record.id));
  identity.append(recordMark, headingGroup);
  top.append(identity, createElement('span', 'domain-badge', record.domain));

  const meta = createElement('ul', 'card-meta');
  meta.append(
    createMetaItem('M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z', record.location),
    createMetaItem('M4 6h16v14H4V6Zm4 0V4h8v2M4 11h16', record.mode),
  );

  const skillsBlock = createElement('div', 'skills-block');
  skillsBlock.append(createElement('p', 'skills-label', 'Skills'));
  const skills = createElement('ul', 'skill-list');
  for (const skill of record.skills) skills.append(createElement('li', '', skill));
  skillsBlock.append(skills);
  const description = record.description ? createElement('p', 'card-description', record.description) : null;
  const footer = createElement('div', 'card-footer');
  const openingText = `${record.openings} ${record.openings === 1 ? 'opening' : 'openings'}`;
  const openings = createElement('div', 'openings-count');
  openings.append(createIcon('M12 3v18M3 12h18'), createElement('strong', '', openingText));
  const sourceText = record.isLive ? `Live · ${record.source || 'Official source'}` : 'Supplied sample record';
  footer.append(openings, createElement('span', `source-label${record.isLive ? ' is-live' : ''}`, sourceText));
  card.append(top, meta, skillsBlock);
  if (description) card.append(description);
  card.append(footer);
  const link = createElement('a', 'internship-card-link');
  link.href = getRecordUrl(record);
  link.setAttribute('aria-label', record.isLive ? `View original opening for ${record.title} at ${record.company} (opens in a new tab)` : `View details for ${record.title}`);
  if (record.isLive && record.sourceUrl) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  link.append(card);
  return link;
}

let sourceRecords = [];

function getUi() {
  return {
    searchForm: document.querySelector('#search-form'),
    searchInput: document.querySelector('#search-input'),
    domainFilter: document.querySelector('#domain-filter'),
    modeFilter: document.querySelector('#mode-filter'),
    skillFilter: document.querySelector('#skill-filter'),
    clearFilters: document.querySelector('#clear-filters'),
    emptyClear: document.querySelector('#empty-clear-button'),
    retry: document.querySelector('#retry-button'),
    grid: document.querySelector('#results-grid'),
    status: document.querySelector('#results-status'),
    loading: document.querySelector('#loading-state'),
    empty: document.querySelector('#empty-state'),
    error: document.querySelector('#error-state'),
  };
}

function hideStates(ui) {
  ui.loading.hidden = true;
  ui.empty.hidden = true;
  ui.error.hidden = true;
}

export function renderLoadingState() {
  const ui = getUi();
  ui.grid.replaceChildren();
  ui.grid.setAttribute('aria-busy', 'true');
  ui.loading.hidden = false;
  ui.empty.hidden = true;
  ui.error.hidden = true;
  ui.status.textContent = 'Loading internships…';
}

export function renderEmptyState() {
  const ui = getUi();
  hideStates(ui);
  ui.empty.hidden = false;
  ui.grid.setAttribute('aria-busy', 'false');
  ui.status.textContent = '0 internships match your search';
}

export function renderErrorState() {
  const ui = getUi();
  hideStates(ui);
  ui.grid.replaceChildren();
  ui.error.hidden = false;
  ui.grid.setAttribute('aria-busy', 'false');
  ui.status.textContent = 'Internships could not be loaded';
}

function renderResults() {
  const ui = getUi();
  const results = filterInternships(sourceRecords, ui.searchInput.value, ui.domainFilter.value, ui.modeFilter.value, ui.skillFilter.value);
  hideStates(ui);
  ui.grid.replaceChildren(...results.map(createInternshipCard));
  ui.grid.setAttribute('aria-busy', 'false');
  const filtersActive = Boolean(cleanText(ui.searchInput.value)) || [ui.domainFilter, ui.modeFilter, ui.skillFilter].some(({ value }) => value !== 'all');
  ui.clearFilters.disabled = !filtersActive;

  if (!results.length) {
    renderEmptyState();
    return;
  }
  const noun = results.length === 1 ? 'internship' : 'internships';
  ui.status.textContent = `${results.length} ${noun} found`;
}

function clearAllFilters({ focus = true } = {}) {
  const ui = getUi();
  ui.searchInput.value = '';
  ui.domainFilter.value = 'all';
  ui.modeFilter.value = 'all';
  ui.skillFilter.value = 'all';
  renderResults();
  if (focus) ui.searchInput.focus();
}

function populateSelect(select, values) {
  select.replaceChildren(select.firstElementChild);
  for (const value of values) {
    const option = createElement('option', '', value);
    option.value = value;
    select.append(option);
  }
}

async function initializeData() {
  renderLoadingState();
  try {
    const { loadInternships } = await import('./data.js');
    const loaded = await loadInternships();
    sourceRecords = loaded.records.map(normalizeInternship).filter(Boolean);
    if (!sourceRecords.length) throw new Error('No valid internships were returned');
    const domains = new Set(sourceRecords.map(({ domain }) => domain));
    document.querySelector('#opportunity-total').textContent = String(sourceRecords.length);
    document.querySelector('#domain-total').textContent = String(domains.size);
    document.querySelector('#remote-total').textContent = String(sourceRecords.filter(({ mode }) => mode === 'Remote').length);
    document.querySelector('#openings-total').textContent = String(sourceRecords.reduce((total, { openings }) => total + openings, 0));
    document.querySelector('#summary-disclosure').textContent = loaded.meta.persistent
      ? 'Internships are loaded from the persistent project database. Records are fictional and intended for this portfolio exercise.'
      : loaded.meta.live
        ? `Current openings aggregated from ${loaded.meta.boardsAvailable || 'available'} official employer job boards. Always verify requirements on the original posting.`
        : 'The API is temporarily unavailable. Showing the five fictional EdVyro records from the built-in fallback.';
    populateSelect(document.querySelector('#domain-filter'), [...domains].sort());
    populateSelect(document.querySelector('#mode-filter'), [...new Set(sourceRecords.map(({ mode }) => mode))].sort());
    populateSelect(document.querySelector('#skill-filter'), [...new Set(sourceRecords.flatMap(({ skills }) => skills))].sort());
    renderResults();
  } catch (error) {
    console.error('Internship data failed to load:', error);
    renderErrorState();
  }
}

function initializeNavigation() {
  const button = document.querySelector('.menu-button');
  const navigation = document.querySelector('#primary-navigation');
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    navigation.classList.toggle('is-open', !expanded);
  });
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      button.setAttribute('aria-expanded', 'false');
      navigation.classList.remove('is-open');
    }
  });
}

function initializeApp() {
  const ui = getUi();
  ui.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    renderResults();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelector('#internships').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });
  ui.searchInput.addEventListener('input', renderResults);
  ui.domainFilter.addEventListener('change', renderResults);
  ui.modeFilter.addEventListener('change', renderResults);
  ui.skillFilter.addEventListener('change', renderResults);
  ui.clearFilters.addEventListener('click', () => clearAllFilters());
  ui.emptyClear.addEventListener('click', () => clearAllFilters());
  ui.retry.addEventListener('click', initializeData);
  document.querySelector('#current-year').textContent = String(new Date().getFullYear());
  initializeNavigation();
  initializeData();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initializeApp);
}
