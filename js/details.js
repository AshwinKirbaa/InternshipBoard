import { loadInternshipDetail } from './data.js';

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

async function renderDetails() {
  const recordId = new URLSearchParams(window.location.search).get('id');
  const record = await loadInternshipDetail(recordId);
  const card = document.querySelector('#detail-card');
  const error = document.querySelector('#detail-error');

  if (!record) {
    document.querySelector('#detail-status').hidden = true;
    error.hidden = false;
    return;
  }

  setText('#detail-id', record.id);
  setText('#detail-title', record.title);
  setText('#detail-domain', record.domain);
  setText('#detail-location', record.location);
  setText('#detail-mode', record.mode);
  setText('#detail-openings', `${record.openings} ${record.openings === 1 ? 'opening' : 'openings'}`);
  const skills = document.querySelector('#detail-skills');
  for (const skill of record.skills) {
    const item = document.createElement('li');
    item.textContent = skill;
    skills.append(item);
  }
  document.title = `${record.title} — Internship Board`;
  card.hidden = false;
}

document.addEventListener('DOMContentLoaded', renderDetails);
