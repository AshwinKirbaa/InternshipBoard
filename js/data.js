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
    const response = await fetchImpl('/api/internships', { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`Live API returned HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.internships) || !payload.internships.length) throw new Error('Live API returned no internships');
    return { records: payload.internships, meta: payload.meta || { live: true, source: 'Official job boards' } };
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
