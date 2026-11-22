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
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset)) {
    return { error: 'page must be a positive integer and limit must be an integer between 1 and 100' };
  }
  return { value: { page, limit } };
}

const applicationAllowedFields = new Set(['internshipId', 'fullName', 'email', 'phone', 'coverNote']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s().-]{7,25}$/;

export function validateApplication(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { errors: [{ field: 'body', message: 'must be a JSON object' }] };
  }

  const keys = Object.keys(input);
  for (const key of keys) {
    if (!applicationAllowedFields.has(key)) {
      errors.push({ field: key, message: 'is not allowed' });
    }
  }

  const required = ['internshipId', 'fullName', 'email', 'coverNote'];
  for (const field of required) {
    if (!(field in input)) {
      errors.push({ field, message: 'is required' });
    }
  }

  const value = {};

  if ('internshipId' in input) {
    if (typeof input.internshipId !== 'string' || !input.internshipId.trim()) {
      errors.push({ field: 'internshipId', message: 'must be a non-empty string' });
    } else {
      const trimmed = input.internshipId.trim();
      if (trimmed.length > 100) {
        errors.push({ field: 'internshipId', message: 'must be at most 100 characters' });
      }
      value.internshipId = trimmed;
    }
  }

  if ('fullName' in input) {
    if (typeof input.fullName !== 'string') {
      errors.push({ field: 'fullName', message: 'must be a string' });
    } else {
      const trimmed = input.fullName.trim();
      if (trimmed.length < 2 || trimmed.length > 100) {
        errors.push({ field: 'fullName', message: 'must be between 2 and 100 characters' });
      }
      value.fullName = trimmed;
    }
  }

  if ('email' in input) {
    if (typeof input.email !== 'string') {
      errors.push({ field: 'email', message: 'must be a string' });
    } else {
      const trimmed = input.email.trim();
      const normalized = trimmed.toLowerCase();
      if (normalized.length > 254 || !EMAIL_REGEX.test(normalized)) {
        errors.push({ field: 'email', message: 'must be a valid email address of at most 254 characters' });
      }
      value.email = normalized;
    }
  }

  if ('phone' in input && input.phone !== null && input.phone !== undefined) {
    if (typeof input.phone !== 'string') {
      errors.push({ field: 'phone', message: 'must be a string' });
    } else {
      const trimmed = input.phone.trim();
      if (trimmed === '') {
        value.phone = null;
      } else {
        const digits = trimmed.replace(/\D/g, '');
        if (trimmed.length < 7 || trimmed.length > 25 || !PHONE_REGEX.test(trimmed) || digits.length < 7) {
          errors.push({ field: 'phone', message: 'must be a valid phone number between 7 and 25 characters' });
        }
        value.phone = trimmed;
      }
    }
  } else {
    value.phone = null;
  }

  if ('coverNote' in input) {
    if (typeof input.coverNote !== 'string') {
      errors.push({ field: 'coverNote', message: 'must be a string' });
    } else {
      const trimmed = input.coverNote.trim();
      if (trimmed.length < 20 || trimmed.length > 2000) {
        errors.push({ field: 'coverNote', message: 'must be between 20 and 2000 characters' });
      }
      value.coverNote = trimmed;
    }
  }

  return errors.length ? { errors } : { value };
}
