import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { authRoutes } from '../auth';
import { initializeDatabase } from '../../db/connection';

// Integration tests for the frontend-initiated auth flow.
//
// The backend exposes exactly three endpoints:
//   POST /auth/callback     - validate Supabase tokens from the frontend, sync user
//   GET  /api/auth/me       - return the authenticated user (authGuard)
//   POST /api/auth/refresh  - exchange a refresh token for new tokens
//
// There is no server-initiated OAuth (no /auth/login, no GET /auth/callback) and
// no backend logout endpoint — those are handled by the Next.js layer.
//
// Full happy-path tests require valid Supabase credentials and a test database;
// the cases below cover the input-validation behaviour that runs without them.

describe('Auth Routes Integration Tests', () => {
  let fastify: any;

  beforeAll(async () => {
    fastify = Fastify();
    await fastify.register(cookie);
    initializeDatabase();
    await fastify.register(authRoutes);
  });

  afterAll(async () => {
    await fastify.close();
  });

  describe('POST /auth/callback', () => {
    it('should reject a request without an access token', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/callback',
        payload: { refreshToken: 'some-refresh-token' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('Missing accessToken');
    });

    it('should reject a request without a refresh token', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/callback',
        headers: { authorization: 'Bearer some-access-token' },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('Missing refreshToken');
    });

    // Note: Validating an access token + syncing the user requires a real/mocked
    // Supabase token and a test database:
    // it('should validate tokens, sync user, and return user data', async () => { ... });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 without authentication', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    // Note: Full test requires a valid token + seeded user.
    // it('should return the authenticated user', async () => { ... });
  });

  describe('POST /api/auth/refresh', () => {
    it('should reject a request with no refresh token in any source', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {},
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe('Missing refresh token');
    });

    // Note: Full test requires a valid refresh token + Supabase credentials.
    // it('should exchange a refresh token for new tokens', async () => { ... });
  });
});
