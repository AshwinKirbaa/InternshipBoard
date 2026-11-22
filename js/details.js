import { loadInternshipDetail } from './data.js';
import { getSourceLabel } from './app.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s().-]{7,25}$/;

export function normalizeApplicationPayload(data = {}) {
  const internshipId = typeof data.internshipId === 'string' ? data.internshipId.trim() : '';
  const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const rawPhone = typeof data.phone === 'string' ? data.phone.trim() : '';
  const phone = rawPhone ? rawPhone : null;
  const coverNote = typeof data.coverNote === 'string' ? data.coverNote.trim() : '';

  return { internshipId, fullName, email, phone, coverNote };
}

export function validateClientApplication(payload) {
  const errors = {};

  if (!payload.internshipId) {
    errors.internshipId = 'Internship ID is missing';
  }

  if (!payload.fullName || payload.fullName.length < 2) {
    errors.fullName = 'Full name must be at least 2 characters';
  } else if (payload.fullName.length > 100) {
    errors.fullName = 'Full name must be at most 100 characters';
  }

  if (!payload.email || payload.email.length > 254 || !EMAIL_REGEX.test(payload.email)) {
    errors.email = 'Please provide a valid email address';
  }

  if (payload.phone) {
    const digits = payload.phone.replace(/\D/g, '');
    if (payload.phone.length < 7 || payload.phone.length > 25 || !PHONE_REGEX.test(payload.phone) || digits.length < 7) {
      errors.phone = 'Please provide a valid phone number (7-25 characters)';
    }
  }

  if (!payload.coverNote || payload.coverNote.length < 20) {
    errors.coverNote = 'Cover note must be at least 20 characters';
  } else if (payload.coverNote.length > 2000) {
    errors.coverNote = 'Cover note must be at most 2000 characters';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function mapServerErrors(details) {
  if (!Array.isArray(details)) return {};
  const map = {};
  for (const item of details) {
    if (item && item.field && item.message) {
      map[item.field] = item.message;
    }
  }
  return map;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

const FIELD_INPUT_IDS = {
  fullName: 'app-full-name',
  email: 'app-email',
  phone: 'app-phone',
  coverNote: 'app-cover-note',
};

function clearFieldErrors() {
  for (const field of Object.keys(FIELD_INPUT_IDS)) {
    const inputId = FIELD_INPUT_IDS[field];
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(`${inputId}-error`);
    if (input) input.setAttribute('aria-invalid', 'false');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  }
}

function applyFieldErrors(errors) {
  let firstInvalid = null;
  for (const [field, message] of Object.entries(errors)) {
    const inputId = FIELD_INPUT_IDS[field];
    if (inputId) {
      const input = document.getElementById(inputId);
      const errorEl = document.getElementById(`${inputId}-error`);
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        if (!firstInvalid) firstInvalid = input;
      }
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.hidden = false;
      }
    }
  }
  if (firstInvalid) {
    firstInvalid.focus();
  }
}

export async function renderDetails() {
  const recordId = new URLSearchParams(window.location.search).get('id');
  const record = await loadInternshipDetail(recordId);
  const card = document.querySelector('#detail-card');
  const error = document.querySelector('#detail-error');
  const appSection = document.querySelector('#application-section');

  if (!record) {
    document.querySelector('#detail-status').hidden = true;
    if (appSection) appSection.hidden = true;
    error.hidden = false;
    return;
  }

  setText('#detail-id', record.id);
  setText('#detail-title', record.title);
  setText('#detail-domain', record.domain);
  setText('#detail-location', record.location);
  setText('#detail-mode', record.mode);
  setText('#detail-openings', `${record.openings} ${record.openings === 1 ? 'opening' : 'openings'}`);
  setText('#detail-status', getSourceLabel(record));
  setText('#detail-disclosure', record.isSample
    ? 'This is a fictional record supplied by EdVyro for this portfolio exercise. No company or application URL was included, so this page does not invent one.'
    : 'This record is stored in the project database and can be managed through the REST API.');
  const skills = document.querySelector('#detail-skills');
  if (skills) {
    skills.replaceChildren();
    for (const skill of record.skills) {
      const item = document.createElement('li');
      item.textContent = skill;
      skills.append(item);
    }
  }
  document.title = `${record.title} — Internship Board`;
  card.hidden = false;

  if (appSection) {
    appSection.hidden = false;
    const internshipIdInput = document.querySelector('#app-internship-id');
    if (internshipIdInput) internshipIdInput.value = record.id;

    const closedNotice = document.querySelector('#application-closed-notice');
    const form = document.querySelector('#application-form');
    const submitBtn = document.querySelector('#app-submit-button');

    if (record.applicationsOpen === false) {
      if (closedNotice) closedNotice.hidden = false;
      if (form) {
        const controls = form.querySelectorAll('input, textarea, button');
        controls.forEach((control) => { control.disabled = true; });
      }
      setText('#app-form-status', 'Applications are closed for this internship.');
    } else {
      if (closedNotice) closedNotice.hidden = true;
      if (submitBtn) submitBtn.disabled = false;
    }
  }
}

let isSubmitting = false;

export async function handleApplicationSubmit(event) {
  event.preventDefault();
  if (isSubmitting) return;

  const form = event.currentTarget;
  const statusEl = document.querySelector('#app-form-status');
  const submitBtn = document.querySelector('#app-submit-button');

  clearFieldErrors();
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.className = 'form-status';
  }

  const formData = new FormData(form);
  const rawPayload = {
    internshipId: formData.get('internshipId'),
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    coverNote: formData.get('coverNote'),
  };

  const payload = normalizeApplicationPayload(rawPayload);
  const clientValidation = validateClientApplication(payload);

  if (!clientValidation.valid) {
    applyFieldErrors(clientValidation.errors);
    if (statusEl) {
      statusEl.textContent = 'Please correct the highlighted fields before submitting.';
      statusEl.className = 'form-status is-error';
    }
    return;
  }

  isSubmitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting application…';
  }
  if (statusEl) {
    statusEl.textContent = 'Submitting your application…';
    statusEl.className = 'form-status is-pending';
  }

  try {
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);

    if (response.status === 201 && body?.data) {
      if (statusEl) {
        statusEl.textContent = `Application submitted successfully! Reference ID: ${body.data.id}`;
        statusEl.className = 'form-status is-success';
      }
      // Clear sensitive inputs while retaining the internshipId
      const internshipId = payload.internshipId;
      form.reset();
      const internshipIdInput = document.querySelector('#app-internship-id');
      if (internshipIdInput) internshipIdInput.value = internshipId;
    } else if (response.status === 422) {
      const serverErrors = mapServerErrors(body?.error?.details);
      applyFieldErrors(serverErrors);
      if (statusEl) {
        statusEl.textContent = body?.error?.message || 'Application data is invalid. Please review the highlighted fields.';
        statusEl.className = 'form-status is-error';
      }
    } else if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitNotice = retryAfter ? ` Please wait ${retryAfter} seconds before trying again.` : ' Please wait before trying again.';
      if (statusEl) {
        statusEl.textContent = `Too many applications submitted from this IP.${waitNotice}`;
        statusEl.className = 'form-status is-error';
      }
    } else if (response.status === 409) {
      if (statusEl) {
        statusEl.textContent = 'Applications have closed for this internship.';
        statusEl.className = 'form-status is-error';
      }
      const controls = form.querySelectorAll('input, textarea, button');
      controls.forEach((control) => { control.disabled = true; });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Submission could not be completed. Please try again.';
        statusEl.className = 'form-status is-error';
      }
    }
  } catch {
    if (statusEl) {
      statusEl.textContent = 'Network error while submitting. Your details were preserved—please try again.';
      statusEl.className = 'form-status is-error';
    }
  } finally {
    isSubmitting = false;
    if (submitBtn && !submitBtn.disabled) {
      submitBtn.textContent = 'Submit application';
    } else if (submitBtn && submitBtn.closest('form').querySelector('input:not([disabled])')) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit application';
    }
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    renderDetails();
    const appForm = document.querySelector('#application-form');
    if (appForm) {
      appForm.addEventListener('submit', handleApplicationSubmit);
    }
  });
}
