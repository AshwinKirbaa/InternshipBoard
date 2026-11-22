const INTERNSHIP_PATTERN = /\b(intern(ship)?|trainee|apprentice(ship)?|graduate (program|programme|trainee|opportunity))\b/i;
const SKILL_DICTIONARY = [
  ['JavaScript', /\bjavascript\b|\bjs\b/i], ['TypeScript', /\btypescript\b/i], ['React', /\breact(?:\.js)?\b/i],
  ['Node.js', /\bnode(?:\.js)?\b/i], ['Python', /\bpython\b/i], ['Java', /\bjava\b/i], ['C++', /\bc\+\+\b/i],
  ['SQL', /\bsql\b/i], ['AWS', /\baws\b|amazon web services/i], ['Azure', /\bazure\b/i], ['GCP', /\bgcp\b|google cloud/i],
  ['Docker', /\bdocker\b/i], ['Kubernetes', /\bkubernetes\b/i], ['Machine Learning', /machine learning/i],
  ['Data Analysis', /data analy(?:sis|tics)/i], ['Figma', /\bfigma\b/i], ['CSS', /\bcss\b/i], ['HTML', /\bhtml\b/i],
  ['Git', /\bgit\b|github/i], ['Linux', /\blinux\b/i], ['Accessibility', /accessibility|\ba11y\b/i],
];

function cleanText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function stripHtml(value) {
  return cleanText(value)
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function isInternshipOpening(job) {
  return Boolean(job && typeof job === 'object' && INTERNSHIP_PATTERN.test(cleanText(job.title)));
}

export function extractSkills(value) {
  const text = cleanText(value);
  return SKILL_DICTIONARY.filter(([, pattern]) => pattern.test(text)).map(([name]) => name).slice(0, 8);
}

function inferMode(job) {
  const text = `${cleanText(job.title)} ${cleanText(job.location?.name)} ${stripHtml(job.content)}`;
  if (/\bremote\b/i.test(text)) return 'Remote';
  if (/\bhybrid\b/i.test(text)) return 'Hybrid';
  return 'On-site';
}

function normalizePublishedAt(value) {
  const published = new Date(value);
  return Number.isNaN(published.getTime()) ? '' : published.toISOString();
}

function liveRecord({ id, title, company, domain, mode, location, description, publishedAt, source, sourceUrl, internshipEvidence = '' }) {
  const safeSourceUrl = normalizeHttpUrl(sourceUrl);
  if (!isInternshipOpening({ title: `${title || ''} ${internshipEvidence}` }) || !cleanText(id) || !cleanText(company) || !safeSourceUrl) return null;
  const cleanDescription = stripHtml(description);
  return {
    id: cleanText(id),
    title: cleanText(title),
    company: cleanText(company),
    domain: cleanText(domain) || 'Other',
    mode: cleanText(mode) || 'On-site',
    location: cleanText(location) || 'Location not specified',
    skills: extractSkills(`${title} ${cleanDescription}`),
    openings: 1,
    salary: '',
    description: cleanDescription.slice(0, 500),
    publishedAt: normalizePublishedAt(publishedAt),
    source,
    sourceUrl: safeSourceUrl,
    isLive: true,
  };
}

export function normalizeGreenhouseJob(job, board) {
  if (!job?.id || !cleanText(board?.company) || !cleanText(board?.token)) return null;
  return liveRecord({ id: `greenhouse-${board.token}-${job.id}`, title: job.title, company: board.company,
    domain: job.departments?.[0]?.name, mode: inferMode(job), location: job.location?.name,
    description: job.content, publishedAt: job.updated_at, source: 'Greenhouse', sourceUrl: job.absolute_url });
}

export function normalizeLeverJob(job, board) {
  const location = cleanText(job?.categories?.location);
  const text = `${job?.text || ''} ${location} ${job?.descriptionPlain || ''}`;
  const workplace = cleanText(job?.workplaceType);
  const mode = /hybrid/i.test(workplace) ? 'Hybrid' : /remote/i.test(workplace) ? 'Remote'
    : /on.?site/i.test(workplace) ? 'On-site' : /\bremote\b/i.test(text) ? 'Remote' : /\bhybrid\b/i.test(text) ? 'Hybrid' : 'On-site';
  return liveRecord({ id: `lever-${board?.token}-${job?.id}`, title: job?.text, company: board?.company,
    domain: job?.categories?.team || job?.categories?.department, mode, location,
    description: job?.descriptionPlain || job?.description, publishedAt: job?.createdAt, internshipEvidence: job?.categories?.commitment,
    source: 'Lever', sourceUrl: job?.hostedUrl || job?.applyUrl });
}

export function normalizeAshbyJob(job, board) {
  if (job?.isListed === false) return null;
  const text = `${job?.title || ''} ${job?.location || ''} ${job?.descriptionPlain || job?.descriptionHtml || ''}`;
  const workplace = cleanText(job?.workplaceType);
  const mode = /hybrid/i.test(workplace) ? 'Hybrid' : /remote/i.test(workplace) ? 'Remote'
    : /on.?site|office/i.test(workplace) ? 'On-site' : job?.isRemote || /\bremote\b/i.test(text) ? 'Remote' : /\bhybrid\b/i.test(text) ? 'Hybrid' : 'On-site';
  return liveRecord({ id: `ashby-${board?.token}-${job?.id || job?.jobUrl}`, title: job?.title, company: board?.company,
    domain: job?.department || job?.team, mode, location: job?.location,
    description: job?.descriptionPlain || job?.descriptionHtml, publishedAt: job?.publishedAt, internshipEvidence: job?.employmentType,
    source: 'Ashby', sourceUrl: job?.jobUrl || job?.applyUrl });
}

export function normalizeGreenhouseResponses(responses) {
  if (!Array.isArray(responses)) return [];
  const seen = new Set();
  const normalized = [];
  for (const response of responses) {
    for (const job of Array.isArray(response?.jobs) ? response.jobs : []) {
      const record = normalizeGreenhouseJob(job, response.board);
      if (!record || seen.has(record.sourceUrl)) continue;
      seen.add(record.sourceUrl);
      normalized.push(record);
    }
  }
  return normalized.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
