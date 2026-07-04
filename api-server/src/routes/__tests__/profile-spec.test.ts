import Fastify from 'fastify';
import { profileSpecRoutes } from '../profile-spec';

jest.mock('../../middleware/auth', () => ({
  authGuard: jest.fn(async (request: any) => {
    request.userId = 'user-a';
  }),
}));

jest.mock('../../services/profile-spec', () => {
  const svc = {
    createSpec: jest.fn(),
    listSpecs: jest.fn(),
    getSpec: jest.fn(),
    updateSpec: jest.fn(),
    deleteSpec: jest.fn(),
  };
  return { ProfileSpecService: jest.fn(() => svc), _svc: svc };
});

const { _svc: mockProfileSpecService } = jest.requireMock('../../services/profile-spec');

function buildApp() {
  const app = Fastify({ logger: false });
  app.register(profileSpecRoutes);
  return app;
}

const PROFILE_ID = 'profile-1';
const SPEC_ID = 'spec-1';
const SPEC = {
  id: SPEC_ID,
  candidate_profile_id: PROFILE_ID,
  name: 'preferences',
  content: '# Preferences',
  created_at: new Date('2026-01-01').toISOString(),
  updated_at: null,
  deleted_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/profile-spec/:profileId', () => {
  it('creates spec and returns 201', async () => {
    const app = buildApp();
    mockProfileSpecService.createSpec.mockResolvedValue(SPEC);

    const res = await app.inject({
      method: 'POST',
      url: `/api/profile-spec/${PROFILE_ID}`,
      headers: { authorization: 'Bearer token' },
      payload: { name: 'preferences', content: '# Preferences' },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).name).toBe('preferences');
  });

  it('returns 409 when duplicate spec name', async () => {
    const app = buildApp();
    mockProfileSpecService.createSpec.mockRejectedValue(
      new Error("Spec with name 'preferences' already exists")
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/profile-spec/${PROFILE_ID}`,
      headers: { authorization: 'Bearer token' },
      payload: { name: 'preferences' },
    });

    expect(res.statusCode).toBe(409);
  });

  it('returns 404 when profile not found or not owned', async () => {
    const app = buildApp();
    mockProfileSpecService.createSpec.mockRejectedValue(
      new Error('Profile not found or access denied')
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/profile-spec/${PROFILE_ID}`,
      headers: { authorization: 'Bearer token' },
      payload: { name: 'preferences' },
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 400 when name is missing', async () => {
    const app = buildApp();

    const res = await app.inject({
      method: 'POST',
      url: `/api/profile-spec/${PROFILE_ID}`,
      headers: { authorization: 'Bearer token' },
      payload: { content: 'no name' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const { authGuard } = require('../../middleware/auth');
    authGuard.mockImplementationOnce(async (_req: any, reply: any) => {
      reply.status(401).send({ error: 'Unauthorized' });
    });

    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/profile-spec/${PROFILE_ID}`,
      payload: { name: 'test' },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/profile-spec/:profileId', () => {
  it('returns sorted list of specs', async () => {
    const app = buildApp();
    mockProfileSpecService.listSpecs.mockResolvedValue([SPEC]);

    const res = await app.inject({
      method: 'GET',
      url: `/api/profile-spec/${PROFILE_ID}`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toHaveLength(1);
  });

  it('returns 403 when profile not owned (service returns null)', async () => {
    const app = buildApp();
    mockProfileSpecService.listSpecs.mockResolvedValue(null);

    const res = await app.inject({
      method: 'GET',
      url: `/api/profile-spec/${PROFILE_ID}`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(403);
  });
});

describe('GET /api/profile-spec/:profileId/:specId', () => {
  it('returns spec when owned', async () => {
    const app = buildApp();
    mockProfileSpecService.getSpec.mockResolvedValue(SPEC);

    const res = await app.inject({
      method: 'GET',
      url: `/api/profile-spec/${PROFILE_ID}/${SPEC_ID}`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).id).toBe(SPEC_ID);
  });

  it('returns 404 when spec not owned or not found', async () => {
    const app = buildApp();
    mockProfileSpecService.getSpec.mockResolvedValue(null);

    const res = await app.inject({
      method: 'GET',
      url: `/api/profile-spec/${PROFILE_ID}/other-spec`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /api/profile-spec/:profileId/:specId', () => {
  it('updates spec and returns updated data', async () => {
    const app = buildApp();
    const updated = { ...SPEC, content: 'Updated content' };
    mockProfileSpecService.updateSpec.mockResolvedValue(updated);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/profile-spec/${PROFILE_ID}/${SPEC_ID}`,
      headers: { authorization: 'Bearer token' },
      payload: { content: 'Updated content' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).content).toBe('Updated content');
  });

  it('returns 404 when spec not found', async () => {
    const app = buildApp();
    mockProfileSpecService.updateSpec.mockResolvedValue(null);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/profile-spec/${PROFILE_ID}/missing`,
      headers: { authorization: 'Bearer token' },
      payload: { content: 'x' },
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 409 when renaming to an existing spec name', async () => {
    const app = buildApp();
    mockProfileSpecService.updateSpec.mockRejectedValue(
      new Error("Spec with name 'stories' already exists")
    );

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/profile-spec/${PROFILE_ID}/${SPEC_ID}`,
      headers: { authorization: 'Bearer token' },
      payload: { name: 'stories' },
    });

    expect(res.statusCode).toBe(409);
  });
});

describe('DELETE /api/profile-spec/:profileId/:specId', () => {
  it('soft-deletes spec and returns 204', async () => {
    const app = buildApp();
    mockProfileSpecService.deleteSpec.mockResolvedValue(true);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/profile-spec/${PROFILE_ID}/${SPEC_ID}`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(204);
  });

  it('returns 404 when spec not found', async () => {
    const app = buildApp();
    mockProfileSpecService.deleteSpec.mockResolvedValue(false);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/profile-spec/${PROFILE_ID}/missing`,
      headers: { authorization: 'Bearer token' },
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 401 when unauthenticated', async () => {
    const { authGuard } = require('../../middleware/auth');
    authGuard.mockImplementationOnce(async (_req: any, reply: any) => {
      reply.status(401).send({ error: 'Unauthorized' });
    });

    const app = buildApp();
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/profile-spec/${PROFILE_ID}/${SPEC_ID}`,
    });

    expect(res.statusCode).toBe(401);
  });
});
