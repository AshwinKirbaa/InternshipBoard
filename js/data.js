// Source: EdVyro Responsive Internship Board supplied records seed.
// https://edvyro.in/datasets/source-materials/internship-records-sample.json
export const internships = [
  { id: 'INT-101', title: 'Frontend Intern', domain: 'Full Stack Development', mode: 'Remote', location: 'India', skills: ['HTML', 'CSS', 'JavaScript'], openings: 3 },
  { id: 'INT-102', title: 'API Engineering Intern', domain: 'Full Stack Development', mode: 'Hybrid', location: 'Pune', skills: ['Node.js', 'SQL', 'Testing'], openings: 2 },
  { id: 'INT-103', title: 'UI/UX Intern', domain: 'UI/UX', mode: 'Remote', location: 'India', skills: ['Figma', 'Research', 'Accessibility'], openings: 1 },
  { id: 'INT-104', title: 'Data Analyst Intern', domain: 'Data Analytics', mode: 'On-site', location: 'Bengaluru', skills: ['Excel', 'SQL', 'Data visualisation'], openings: 2 },
  { id: 'INT-105', title: 'Security Operations Intern', domain: 'Cyber Security', mode: 'Remote', location: 'India', skills: ['Linux', 'Logs', 'Networking'], openings: 1 },
];

export async function loadInternships(fetchImpl = fetch) {
  try {
    const response = await fetchImpl('/api/internships?limit=100', { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`Internship API returned HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.data) || !payload.data.length) throw new Error('Internship API returned no internships');
    return {
      records: payload.data,
      meta: { live: false, persistent: true, source: 'Persistent internship database', count: payload.pagination?.total ?? payload.data.length },
    };
  } catch {
    return {
      records: internships,
      meta: {
        live: false,
        fallback: true,
        source: 'EdVyro supplied sample records',
        count: internships.length,
      },
    };
  }
}

export async function loadInternshipDetail(id, fetchImpl = fetch) {
  if (!id) return null;
  try {
    const response = await fetchImpl(`/api/internships/${encodeURIComponent(id)}`, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`Internship API returned HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload?.data) throw new Error('Internship API returned no record');
    return payload.data;
  } catch {
    return internships.find((record) => record.id === id) || null;
  }
}
