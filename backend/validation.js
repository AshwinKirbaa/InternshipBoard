const modes = new Set(['Remote', 'Hybrid', 'On-site']);
const allowedFields = new Set(['id', 'title', 'domain', 'mode', 'location', 'skills', 'openings', 'durationWeeks', 'applicationsOpen']);
const mutableFields = new Set([...allowedFields].filter((field) => field !== 'id'));

function nonEmptyString(value, field, errors, { max = 120 } = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push({ field, message: 'must be a non-empty string' });
    return value;
  }
  const trimmed = value.trim();
  if (trimmed.length > max) errors.push({ field, message: `must be at most ${max} characters` });
  return trimmed;
}

export function validateInternship(input, { partial = false, requireId = false } = {}) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { errors: [{ field: 'body', message: 'must be a JSON object' }] };
  }

  const keys = Object.keys(input);
  const accepted = partial ? mutableFields : allowedFields;
  for (const key of keys) {
    if (!accepted.has(key)) errors.push({ field: key, message: 'is not allowed' });
  }
  if (partial && keys.length === 0) errors.push({ field: 'body', message: 'must include at least one field' });

  const required = requireId
    ? ['id', 'title', 'domain', 'mode', 'location', 'skills', 'openings']
    : ['title', 'domain', 'mode', 'location', 'skills', 'openings'];
  if (!partial) {
    for (const field of required) if (!(field in input)) errors.push({ field, message: 'is required' });
  }

  const value = {};
  if ('id' in input) {
    value.id = nonEmptyString(input.id, 'id', errors, { max: 40 });
    if (typeof value.id === 'string' && !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value.id)) {
      errors.push({ field: 'id', message: 'may contain only letters, numbers, underscores, and hyphens' });
    }
  }
  for (const field of ['title', 'domain', 'location']) {
    if (field in input) value[field] = nonEmptyString(input[field], field, errors);
  }
  if ('mode' in input) {
    value.mode = input.mode;
    if (!modes.has(input.mode)) errors.push({ field: 'mode', message: 'must be Remote, Hybrid, or On-site' });
  }
  if ('skills' in input) {
    if (!Array.isArray(input.skills) || input.skills.length === 0 || input.skills.length > 20) {
      errors.push({ field: 'skills', message: 'must contain between 1 and 20 skills' });
    } else {
      value.skills = input.skills.map((skill, index) => nonEmptyString(skill, `skills[${index}]`, errors, { max: 50 }));
      if (new Set(value.skills).size !== value.skills.length) errors.push({ field: 'skills', message: 'must not contain duplicates' });
    }
  }
  if ('openings' in input) {
    value.openings = input.openings;
    if (!Number.isInteger(input.openings) || input.openings < 1 || input.openings > 1000) {
      errors.push({ field: 'openings', message: 'must be an integer between 1 and 1000' });
    }
  }
  if ('durationWeeks' in input) {
    value.durationWeeks = input.durationWeeks;
    if (input.durationWeeks !== null && (!Number.isInteger(input.durationWeeks) || input.durationWeeks < 1 || input.durationWeeks > 104)) {
      errors.push({ field: 'durationWeeks', message: 'must be null or an integer between 1 and 104' });
    }
  } else if (!partial) {
    value.durationWeeks = null;
  }
  if ('applicationsOpen' in input) {
    value.applicationsOpen = input.applicationsOpen;
    if (typeof input.applicationsOpen !== 'boolean') errors.push({ field: 'applicationsOpen', message: 'must be a boolean' });
  } else if (!partial) {
    value.applicationsOpen = true;
  }

  return errors.length ? { errors } : { value };
}

export function parsePagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { error: 'page must be a positive integer and limit must be an integer between 1 and 100' };
  }
  return { value: { page, limit } };
}
