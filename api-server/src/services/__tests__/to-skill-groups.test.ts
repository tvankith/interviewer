import { toSkillGroups } from '../to-skill-groups';

describe('toSkillGroups', () => {
  it('wraps a legacy flat string array into a single uncategorized group', () => {
    expect(toSkillGroups(['Python', 'React'])).toEqual([{ skills: ['Python', 'React'] }]);
  });

  it('returns an empty array for an empty flat string array', () => {
    expect(toSkillGroups([])).toEqual([]);
  });

  it('passes through an already-grouped SkillGroup array', () => {
    const groups = [
      { category: 'Languages', skills: ['Python', 'Go'] },
      { skills: ['Excel'] },
    ];
    expect(toSkillGroups(groups)).toEqual(groups);
  });

  it('returns an empty array for null', () => {
    expect(toSkillGroups(null)).toEqual([]);
  });

  it('returns an empty array for undefined', () => {
    expect(toSkillGroups(undefined)).toEqual([]);
  });

  it('filters out malformed entries from a mixed array', () => {
    const groups = [
      { category: 'Languages', skills: ['Python'] },
      { category: 'Broken' },
      'not-an-object',
      { skills: ['SQL'] },
    ];
    expect(toSkillGroups(groups)).toEqual([
      { category: 'Languages', skills: ['Python'] },
      { skills: ['SQL'] },
    ]);
  });
});
