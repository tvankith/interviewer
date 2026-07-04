import { ProfileSpecRepository } from '../profile-spec';
import { getDatabase } from '../../db/connection';

jest.mock('../../db/connection');

const mockDb = {
  candidate_profile: {
    findUnique: jest.fn(),
  },
  profile_spec: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

(getDatabase as jest.Mock).mockReturnValue(mockDb);

const repo = new ProfileSpecRepository();

const USER_A = 'user-a';
const USER_B = 'user-b';
const PROFILE_ID = 'profile-1';
const SPEC_ID = 'spec-1';

function makeProfile(overrides: Record<string, unknown> = {}) {
  return { id: PROFILE_ID, user_id: USER_A, deleted_at: null, ...overrides };
}

function makeSpec(overrides: Record<string, unknown> = {}) {
  return {
    id: SPEC_ID,
    candidate_profile_id: PROFILE_ID,
    name: 'preferences',
    content: '# Preferences',
    created_at: new Date('2026-01-01'),
    updated_at: null,
    deleted_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProfileSpecRepository.findByProfileIdAndId', () => {
  it('returns spec when profile owned and spec exists', async () => {
    const spec = makeSpec();
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile());
    mockDb.profile_spec.findUnique.mockResolvedValue(spec);

    expect(await repo.findByProfileIdAndId(PROFILE_ID, SPEC_ID, USER_A)).toBe(spec);
  });

  it('returns null when profile belongs to another user', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile({ user_id: USER_B }));
    expect(await repo.findByProfileIdAndId(PROFILE_ID, SPEC_ID, USER_A)).toBeNull();
  });

  it('returns null when profile is soft-deleted', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(
      makeProfile({ deleted_at: new Date() })
    );
    expect(await repo.findByProfileIdAndId(PROFILE_ID, SPEC_ID, USER_A)).toBeNull();
  });

  it('returns null when spec is soft-deleted', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile());
    mockDb.profile_spec.findUnique.mockResolvedValue(makeSpec({ deleted_at: new Date() }));
    expect(await repo.findByProfileIdAndId(PROFILE_ID, SPEC_ID, USER_A)).toBeNull();
  });

  it('returns null when spec belongs to a different profile', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile());
    mockDb.profile_spec.findUnique.mockResolvedValue(
      makeSpec({ candidate_profile_id: 'other-profile' })
    );
    expect(await repo.findByProfileIdAndId(PROFILE_ID, SPEC_ID, USER_A)).toBeNull();
  });
});

describe('ProfileSpecRepository.findByProfileId', () => {
  it('returns sorted specs for owned profile', async () => {
    const specs = [makeSpec(), makeSpec({ id: 'spec-2', name: 'stories' })];
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile());
    mockDb.profile_spec.findMany.mockResolvedValue(specs);

    const result = await repo.findByProfileId(PROFILE_ID, USER_A);
    expect(result).toBe(specs);
    expect(mockDb.profile_spec.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { candidate_profile_id: PROFILE_ID, deleted_at: null },
        orderBy: { created_at: 'asc' },
      })
    );
  });

  it('returns empty array when profile not owned', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile({ user_id: USER_B }));
    expect(await repo.findByProfileId(PROFILE_ID, USER_A)).toEqual([]);
  });
});

describe('ProfileSpecRepository.create', () => {
  it('creates spec when profile is owned and name is unique', async () => {
    const spec = makeSpec();
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile());
    mockDb.profile_spec.findFirst.mockResolvedValue(null);
    mockDb.profile_spec.create.mockResolvedValue(spec);

    const result = await repo.create(PROFILE_ID, USER_A, { name: 'preferences', content: '# Preferences' });
    expect(result).toBe(spec);
  });

  it('throws when profile not owned', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile({ user_id: USER_B }));
    await expect(repo.create(PROFILE_ID, USER_A, { name: 'preferences' })).rejects.toThrow(
      'Profile not found or access denied'
    );
  });

  it('throws on duplicate name within same profile', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile());
    mockDb.profile_spec.findFirst.mockResolvedValue(makeSpec());

    await expect(repo.create(PROFILE_ID, USER_A, { name: 'preferences' })).rejects.toThrow(
      "already exists"
    );
  });
});

describe('ProfileSpecRepository.update', () => {
  it('updates spec and sets updated_at', async () => {
    const updated = makeSpec({ content: 'new content', updated_at: new Date() });
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile());
    mockDb.profile_spec.findUnique.mockResolvedValue(makeSpec());
    mockDb.profile_spec.findFirst.mockResolvedValue(null);
    mockDb.profile_spec.update.mockResolvedValue(updated);

    const result = await repo.update(PROFILE_ID, SPEC_ID, USER_A, { content: 'new content' });
    expect(result).toBe(updated);
    expect(mockDb.profile_spec.update).toHaveBeenCalledWith({
      where: { id: SPEC_ID },
      data: expect.objectContaining({ content: 'new content', updated_at: expect.any(Date) }),
    });
  });

  it('returns null when profile not owned', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile({ user_id: USER_B }));
    expect(await repo.update(PROFILE_ID, SPEC_ID, USER_A, {})).toBeNull();
  });

  it('throws when renaming to an existing spec name', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile());
    mockDb.profile_spec.findUnique.mockResolvedValue(makeSpec({ name: 'preferences' }));
    mockDb.profile_spec.findFirst.mockResolvedValue(makeSpec({ id: 'spec-2', name: 'stories' }));

    await expect(repo.update(PROFILE_ID, SPEC_ID, USER_A, { name: 'stories' })).rejects.toThrow(
      'already exists'
    );
  });
});

describe('ProfileSpecRepository.delete', () => {
  it('soft-deletes spec by setting deleted_at', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile());
    mockDb.profile_spec.findUnique.mockResolvedValue(makeSpec());
    mockDb.profile_spec.update.mockResolvedValue({});

    const result = await repo.delete(PROFILE_ID, SPEC_ID, USER_A);
    expect(result).toBe(true);
    expect(mockDb.profile_spec.update).toHaveBeenCalledWith({
      where: { id: SPEC_ID },
      data: { deleted_at: expect.any(Date) },
    });
  });

  it('returns false when profile not owned', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile({ user_id: USER_B }));
    expect(await repo.delete(PROFILE_ID, SPEC_ID, USER_A)).toBe(false);
  });

  it('returns false when spec already soft-deleted', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile());
    mockDb.profile_spec.findUnique.mockResolvedValue(makeSpec({ deleted_at: new Date() }));
    expect(await repo.delete(PROFILE_ID, SPEC_ID, USER_A)).toBe(false);
  });
});
