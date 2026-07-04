import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { profileRoutes } from '../profile';
import { UnsupportedFormatError } from '../../services/resume-text-extractor';

jest.mock('../../middleware/auth', () => ({
  authGuard: jest.fn(async (request: any) => {
    request.userId = 'user-a';
  }),
}));

jest.mock('../../services/resume-parser', () => {
  const svc = { parse: jest.fn() };
  return { ResumeParserService: jest.fn(() => svc), _svc: svc };
});

// ProfileService is constructed at module import time by profile.ts; stub it out.
jest.mock('../../services/profile', () => ({ ProfileService: jest.fn(() => ({})) }));

const { _svc: mockParser } = jest.requireMock('../../services/resume-parser');

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(multipart);
  await app.register(profileRoutes);
  await app.ready();
  return app;
}

function multipartBody(filename: string, content: string, contentType: string) {
  const boundary = '----jesttestboundary';
  const body =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--\r\n`;
  return { body, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/profile/resume/parse', () => {
  it('returns 200 with the parsed resume', async () => {
    const app = await buildApp();
    const parsed = { name: 'Jane Doe', skills: ['React'], links: [], projects: [], experiences: [], educations: [] };
    mockParser.parse.mockResolvedValue(parsed);

    const { body, headers } = multipartBody('resume.pdf', '%PDF-1.4 fake', 'application/pdf');
    const res = await app.inject({
      method: 'POST',
      url: '/api/profile/resume/parse',
      headers: { ...headers, authorization: 'Bearer token' },
      payload: body,
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).name).toBe('Jane Doe');
    await app.close();
  });

  it('returns 400 for unsupported file formats', async () => {
    const app = await buildApp();
    mockParser.parse.mockRejectedValue(new UnsupportedFormatError('resume.txt'));

    const { body, headers } = multipartBody('resume.txt', 'plain text', 'text/plain');
    const res = await app.inject({
      method: 'POST',
      url: '/api/profile/resume/parse',
      headers: { ...headers, authorization: 'Bearer token' },
      payload: body,
    });

    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('returns 400 when no file is uploaded', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/profile/resume/parse',
      headers: { 'content-type': 'application/json', authorization: 'Bearer token' },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
