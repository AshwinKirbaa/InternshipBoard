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

function isSafeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
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

export function normalizeGreenhouseJob(job, board) {
  if (!isInternshipOpening(job) || !job.id || !cleanText(board?.company) || !cleanText(board?.token) || !isSafeHttpUrl(job.absolute_url)) return null;
  const published = new Date(job.updated_at);
  const publishedAt = Number.isNaN(published.getTime()) ? '' : published.toISOString();
  const description = stripHtml(job.content);
  return {
    id: `greenhouse-${board.token}-${job.id}`,
    title: cleanText(job.title),
    company: cleanText(board.company),
    domain: cleanText(job.departments?.[0]?.name) || 'Other',
    mode: inferMode(job),
    location: cleanText(job.location?.name) || 'Location not specified',
    skills: extractSkills(`${job.title} ${description}`),
    openings: 1,
    salary: '',
    description: description.slice(0, 500),
    publishedAt,
    source: 'Greenhouse',
    sourceUrl: job.absolute_url,
    isLive: true,
  };
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
