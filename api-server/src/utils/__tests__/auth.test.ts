import { describe, it, expect, beforeAll } from '@jest/globals';
import { decodeAccessToken, extractBearerToken, getTokenPayload } from '../auth';
import jwt from 'jsonwebtoken';

// Note: These tests are documented for future implementation
// They require proper Supabase test keys and JWKS endpoint

describe('Auth Utilities', () => {
  const testSecret = process.env.SUPABASE_JWT_SECRET || 'test-secret';

  beforeAll(() => {
    // decodeAccessToken verifies HS256 tokens with SUPABASE_JWT_SECRET; make sure
    // it matches the secret these tests sign their tokens with.
    process.env.SUPABASE_JWT_SECRET = testSecret;
  });

  describe('extractBearerToken', () => {
    it('should extract token from valid Authorization header', () => {
      const token = 'test-token-123';
      const header = `Bearer ${token}`;
      const result = extractBearerToken(header);
      expect(result).toBe(token);
    });

    it('should throw on missing Authorization header', () => {
      expect(() => extractBearerToken(undefined)).toThrow('Missing authorization header');
    });

    it('should throw on invalid Authorization header format', () => {
      expect(() => extractBearerToken('InvalidFormat')).toThrow('Invalid authorization header format');
      expect(() => extractBearerToken('NotBearer token')).toThrow('Invalid authorization header format');
    });
  });

  describe('decodeAccessToken', () => {
    it('should decode valid HS256 token', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com', iat: Math.floor(Date.now() / 1000) };
      const token = jwt.sign(payload, testSecret, { algorithm: 'HS256' });

      const result = await decodeAccessToken(token);
      expect(result.sub).toBe('user-123');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw on expired HS256 token', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com', exp: Math.floor(Date.now() / 1000) - 3600 };
      const token = jwt.sign(payload, testSecret, { algorithm: 'HS256' });

      await expect(decodeAccessToken(token)).rejects.toThrow('Token expired');
    });

    it('should throw on invalid token signature', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = jwt.sign(payload, 'wrong-secret', { algorithm: 'HS256' });

      await expect(decodeAccessToken(token)).rejects.toThrow();
    });

    it('should throw when SUPABASE_JWT_SECRET missing for HS256', async () => {
      const oldSecret = process.env.SUPABASE_JWT_SECRET;
      delete process.env.SUPABASE_JWT_SECRET;

      try {
        const payload = { sub: 'user-123' };
        const token = jwt.sign(payload, 'any-secret', { algorithm: 'HS256' });
        await expect(decodeAccessToken(token)).rejects.toThrow();
      } finally {
        if (oldSecret) process.env.SUPABASE_JWT_SECRET = oldSecret;
      }
    });
  });

  describe('getTokenPayload', () => {
    it('should extract and decode valid Bearer token', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com', iat: Math.floor(Date.now() / 1000) };
      const token = jwt.sign(payload, testSecret, { algorithm: 'HS256' });
      const authHeader = `Bearer ${token}`;

      const result = await getTokenPayload(authHeader);
      expect(result.sub).toBe('user-123');
    });

    it('should throw on missing Authorization header', async () => {
      await expect(getTokenPayload(undefined)).rejects.toThrow('Missing authorization header');
    });
  });
});
