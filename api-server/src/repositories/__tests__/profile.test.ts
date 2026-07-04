import { ProfileRepository } from '../profile';
import { getDatabase } from '../../db/connection';

jest.mock('../../db/connection');

const mockDb = {
  candidate_profile: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

(getDatabase as jest.Mock).mockReturnValue(mockDb);

const repo = new ProfileRepository();

const USER_A = 'user-a';
const USER_B = 'user-b';

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1',
    user_id: USER_A,
    title: null,
    name: 'Test User',
    email: null,
    phone: null,
    location: null,
    summary: null,
    website: null,
    skills: [],
    projects: [],
    experiences: [],
    educations: [],
    links: [],
    created_at: new Date('2026-01-01'),
    deleted_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProfileRepository.create', () => {
  it('creates a profile with userId and input', async () => {
    const profile = makeProfile();
    mockDb.candidate_profile.create.mockResolvedValue(profile);

    const result = await repo.create(USER_A, { name: 'Test User' });

    expect(mockDb.candidate_profile.create).toHaveBeenCalledWith({
      data: { user_id: USER_A, name: 'Test User' },
    });
    expect(result).toBe(profile);
  });
});

describe('ProfileRepository.getById', () => {
  it('returns profile when found and owned by user', async () => {
    const profile = makeProfile();
    mockDb.candidate_profile.findUnique.mockResolvedValue(profile);

    const result = await repo.getById('profile-1', USER_A);
    expect(result).toBe(profile);
  });

  it('returns null when profile does not exist', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(null);
    expect(await repo.getById('missing', USER_A)).toBeNull();
  });

  it('returns null when profile belongs to another user', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile({ user_id: USER_B }));
    expect(await repo.getById('profile-1', USER_A)).toBeNull();
  });

  it('returns null when profile is soft-deleted', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(
      makeProfile({ deleted_at: new Date() })
    );
    expect(await repo.getById('profile-1', USER_A)).toBeNull();
  });
});

describe('ProfileRepository.update', () => {
  it('updates and returns the updated profile', async () => {
    const existing = makeProfile();
    const updated = makeProfile({ name: 'Updated' });
    mockDb.candidate_profile.findUnique.mockResolvedValue(existing);
    mockDb.candidate_profile.update.mockResolvedValue(updated);

    const result = await repo.update('profile-1', USER_A, { name: 'Updated' });
    expect(result).toBe(updated);
    expect(mockDb.candidate_profile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { name: 'Updated' },
    });
  });

  it('returns null when profile not found', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(null);
    expect(await repo.update('profile-1', USER_A, {})).toBeNull();
  });

  it('returns null when owned by another user', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile({ user_id: USER_B }));
    expect(await repo.update('profile-1', USER_A, {})).toBeNull();
  });

  it('returns null when soft-deleted', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(
      makeProfile({ deleted_at: new Date() })
    );
    expect(await repo.update('profile-1', USER_A, {})).toBeNull();
  });
});

describe('ProfileRepository.delete', () => {
  it('soft-deletes by setting deleted_at', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile());
    mockDb.candidate_profile.update.mockResolvedValue({});

    const result = await repo.delete('profile-1', USER_A);

    expect(result).toBe(true);
    expect(mockDb.candidate_profile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { deleted_at: expect.any(Date) },
    });
  });

  it('returns false when profile not found', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(null);
    expect(await repo.delete('profile-1', USER_A)).toBe(false);
  });

  it('returns false when owned by another user', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(makeProfile({ user_id: USER_B }));
    expect(await repo.delete('profile-1', USER_A)).toBe(false);
  });

  it('returns false when already soft-deleted', async () => {
    mockDb.candidate_profile.findUnique.mockResolvedValue(
      makeProfile({ deleted_at: new Date() })
    );
    expect(await repo.delete('profile-1', USER_A)).toBe(false);
  });
});

describe('ProfileRepository.list', () => {
  it('returns paginated profiles for the user excluding soft-deleted', async () => {
    const profiles = [makeProfile()];
    mockDb.candidate_profile.findMany.mockResolvedValue(profiles);
    mockDb.candidate_profile.count.mockResolvedValue(1);

    const result = await repo.list(USER_A, { page: 1, limit: 10 });

    expect(result).toEqual({ items: profiles, total: 1, page: 1, limit: 10 });
    expect(mockDb.candidate_profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: USER_A, deleted_at: null } })
    );
  });

  it('uses default pagination when options omitted', async () => {
    mockDb.candidate_profile.findMany.mockResolvedValue([]);
    mockDb.candidate_profile.count.mockResolvedValue(0);

    const result = await repo.list(USER_A);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });
});
