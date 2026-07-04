import Fastify from 'fastify';
import { profileRoutes } from '../profile';

jest.mock('../../middleware/auth', () => ({
  authGuard: jest.fn(async (request: any) => {
    request.userId = 'user-a';
  }),
}));

jest.mock('../../services/profile', () => {
  const svc = {
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
  };
  return { ProfileService: jest.fn(() => svc), _svc: svc };
});

const { _svc: mockProfileService } = jest.requireMock('../../services/profile');

function buildApp() {
  const app = Fastify({ logger: false });
  app.register(profileRoutes);
  return app;
}

const PROFILE = {
  id: 'profile-1',
  user_id: 'user-a',
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
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/profile', () => {
  it('creates profile and returns 201', async () => {
    const app = buildApp();
    mockProfileService.create.mockResolvedValue(PROFILE);

    const res = await app.inject({
      method: 'POST',
      url: '/api/profile',
      headers: { authorization: 'Bearer token' },
      payload: { name: 'Test User' },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).name).toBe('Test User');
  });

  it('returns 400 for invalid email', async () => {
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/profile',
      headers: { authorization: 'Bearer token' },
      payload: { email: 'not-an-email' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const { authGuard } = require('../../middleware/auth');
    authGuard.mockImplementationOnce(async (_req: any, reply: any) => {
      reply.status(401).send({ error: 'Unauthorized' });
    });

    const app = buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/profile', payload: {} });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/profile/:id', () => {
  it('returns profile when found and owned', async () => {
    const app = buildApp();
    mockProfileService.getById.mockResolvedValue(PROFILE);

    const res = await app.inject({
      method: 'GET',
      url: '/api/profile/profile-1',
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).id).toBe('profile-1');
  });

  it('returns 404 when not found', async () => {
    const app = buildApp();
    mockProfileService.getById.mockResolvedValue(null);

    const res = await app.inject({
      method: 'GET',
      url: '/api/profile/missing',
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when profile belongs to another user (service returns null)', async () => {
    const app = buildApp();
    mockProfileService.getById.mockResolvedValue(null);

    const res = await app.inject({
      method: 'GET',
      url: '/api/profile/other-users-profile',
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('PUT /api/profile/:id', () => {
  it('updates profile and returns updated data', async () => {
    const app = buildApp();
    const updated = { ...PROFILE, name: 'Updated' };
    mockProfileService.update.mockResolvedValue(updated);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/profile/profile-1',
      headers: { authorization: 'Bearer token' },
      payload: { name: 'Updated' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).name).toBe('Updated');
  });

  it('returns 404 when profile not found', async () => {
    const app = buildApp();
    mockProfileService.update.mockResolvedValue(null);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/profile/missing',
      headers: { authorization: 'Bearer token' },
      payload: { name: 'Test' },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/profile/:id', () => {
  it('soft-deletes profile and returns 204', async () => {
    const app = buildApp();
    mockProfileService.delete.mockResolvedValue(true);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/profile/profile-1',
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(204);
  });

  it('returns 404 when profile not found', async () => {
    const app = buildApp();
    mockProfileService.delete.mockResolvedValue(false);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/profile/missing',
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/me/profiles', () => {
  it('returns paginated list excluding soft-deleted', async () => {
    const app = buildApp();
    mockProfileService.list.mockResolvedValue({ items: [PROFILE], total: 1, page: 1, limit: 10 });

    const res = await app.inject({
      method: 'GET',
      url: '/api/me/profiles',
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBe(1);
    expect(body.items).toHaveLength(1);
  });

  it('returns empty list when no profiles', async () => {
    const app = buildApp();
    mockProfileService.list.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });

    const res = await app.inject({
      method: 'GET',
      url: '/api/me/profiles',
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).items).toHaveLength(0);
  });
});
