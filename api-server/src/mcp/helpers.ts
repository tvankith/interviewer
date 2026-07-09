import type { candidate_profile } from '@prisma/client';
import { toSkillGroups } from '../services/to-skill-groups';

export function formatDescriptionAsHtml(description?: string | string[] | null): string | null {
  if (!description) return null;

  if (Array.isArray(description)) {
    if (description.length === 0) return null;
    const items = description.map((item) => `<li>${item}</li>`).join('\n');
    return `<ul>\n${items}\n</ul>`;
  }

  if (typeof description === 'string') {
    if (description.includes('<ul>')) return description;
    const lines = description.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      const items = lines.map((l) => `<li>${l}</li>`).join('\n');
      return `<ul>\n${items}\n</ul>`;
    }
    return description;
  }

  return null;
}

export function candidateToDict(
  candidate: candidate_profile,
  fields?: string[]
): Record<string, unknown> {
  const full: Record<string, unknown> = {
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    location: candidate.location,
    summary: candidate.summary,
    website: candidate.website,
    skills: toSkillGroups(candidate.skills),
    links: candidate.links ?? [],
    experiences: candidate.experiences ?? [],
    projects: candidate.projects ?? [],
    educations: candidate.educations ?? [],
    title: candidate.title,
  };

  if (fields) {
    return Object.fromEntries(Object.entries(full).filter(([k]) => fields.includes(k)));
  }
  return full;
}
