import type { FastifyRequest, FastifyReply } from 'fastify';
import type { User } from '@prisma/client';
import { decodeAccessToken, extractBearerToken } from '../utils/auth';
import { AuthService } from '../services/auth';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    user?: User;
  }
}

export function getTokenFromRequest(request: FastifyRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.authorization;
  if (authHeader) {
    try {
      return extractBearerToken(authHeader);
    } catch {
      // Authorization header present but invalid format, continue to try cookies
    }
  }

  // Try access_token cookie
  if (request.cookies && request.cookies.access_token) {
    return request.cookies.access_token;
  }

  return null;
}

export async function authGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      request.log.warn({ event: 'auth_guard_failed', reason: 'missing_token' }, 'Authentication failed: missing token');
      reply.status(401).send({ error: 'Unauthorized', message: 'Missing token' });
      return;
    }

    // Decode and validate token
    const payload = await decodeAccessToken(token);

    const userId = payload.sub;
    if (!userId) {
      request.log.warn({ event: 'auth_guard_failed', reason: 'invalid_payload' }, 'Authentication failed: invalid token payload');
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token payload' });
      return;
    }

    // Lookup user in database
    const authService = new AuthService();
    const startTime = Date.now();
    const user = await authService.getUserById(userId);
    const duration = Date.now() - startTime;

    if (!user) {
      request.log.warn(
        { event: 'auth_guard_failed', reason: 'user_not_found', userId, duration },
        'Authentication failed: user not found'
      );
      reply.status(401).send({ error: 'Unauthorized', message: 'User not found' });
      return;
    }

    // Attach user to request
    request.user = user;
    request.userId = user.id;

    request.log.debug(
      { event: 'auth_guard_success', userId, duration },
      `User authenticated: ${user.email}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token validation failed';
    request.log.error(
      { event: 'auth_guard_error', error: message, stack: err instanceof Error ? err.stack : undefined },
      `Authentication error: ${message}`
    );
    reply.status(401).send({ error: 'Unauthorized', message });
  }
}

export async function optionalAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      request.log.debug({ event: 'optional_auth', authenticated: false }, 'Optional auth: no token provided');
      return;
    }

    // Decode and validate token
    const payload = await decodeAccessToken(token);

    const userId = payload.sub;
    if (!userId) {
      request.log.debug({ event: 'optional_auth', authenticated: false, reason: 'invalid_payload' }, 'Optional auth: invalid token payload');
      return;
    }

    // Lookup user in database
    const authService = new AuthService();
    const startTime = Date.now();
    const user = await authService.getUserById(userId);
    const duration = Date.now() - startTime;

    if (user) {
      // Attach user to request
      request.user = user;
      request.userId = user.id;
      request.log.debug(
        { event: 'optional_auth', authenticated: true, userId, duration },
        `Optional auth: user authenticated (${user.email})`
      );
    } else {
      request.log.debug(
        { event: 'optional_auth', authenticated: false, userId, duration, reason: 'user_not_found' },
        'Optional auth: user not found in database'
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    request.log.debug(
      { event: 'optional_auth', authenticated: false, error: message },
      `Optional auth: token validation failed, continuing without auth`
    );
  }
}
