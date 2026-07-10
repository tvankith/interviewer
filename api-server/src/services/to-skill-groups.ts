export type SkillGroup = {
  category?: string;
  skills: string[];
};

export function toSkillGroups(raw: unknown): SkillGroup[] {
  if (Array.isArray(raw) && raw.every((item) => typeof item === 'string')) {
    return raw.length > 0 ? [{ skills: raw as string[] }] : [];
  }

  if (Array.isArray(raw)) {
    return raw.filter(
      (item): item is SkillGroup =>
        typeof item === 'object' && item !== null && Array.isArray((item as SkillGroup).skills)
    );
  }

  return [];
}
