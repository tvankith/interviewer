import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from '../services/auth';
import { decodeAccessToken, extractBearerToken } from '../utils/auth';
import { authGuard } from '../middleware/auth';
import { env } from '../config/env';

const authService = new AuthService();

function getSupabaseClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey);
}

/**
 * Auth routes (frontend-initiated OAuth flow).
 *
 * The frontend initiates OAuth directly with Supabase and obtains the session
 * tokens client-side. It then sends those tokens to the backend for validation
 * and user sync. The backend never performs OAuth redirects and never sets
 * cookies — the Next.js API layer owns httpOnly cookie management.
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /auth/callback - Validate Supabase tokens from the frontend and sync user.
  // accessToken arrives via the Authorization header (Bearer); refreshToken in the body.
  // Returns user data only. Cookies are set by the Next.js API route, not here.
  fastify.post<{ Body: { accessToken?: string; refreshToken?: string } }>(
    '/auth/callback',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Access token comes via the Authorization header (Bearer schema)
        let accessToken: string;
        try {
          accessToken = extractBearerToken(request.headers.authorization);
        } catch {
          request.log.warn(
            { event: 'auth_callback_error', reason: 'missing_access_token' },
            'Callback missing access token'
          );
          reply.status(400).send({ error: 'Missing accessToken' });
          return;
        }

        const body = request.body as { refreshToken?: string } | undefined;
        const refreshToken = body?.refreshToken;
        if (!refreshToken) {
          request.log.warn(
            { event: 'auth_callback_error', reason: 'missing_refresh_token' },
            'Callback missing refresh token'
          );
          reply.status(400).send({ error: 'Missing refreshToken' });
          return;
        }

        // Validate the access token (HS256 dev / RS256 prod via Supabase JWKS)
        let payload;
        try {
          payload = await decodeAccessToken(accessToken);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Invalid token';
          request.log.warn(
            { event: 'auth_callback_invalid_token', error: message },
            'Callback token validation failed'
          );
          reply.status(401).send({ error: 'Unauthorized', message });
          return;
        }

        const userId = payload.sub;
        if (!userId) {
          request.log.warn(
            { event: 'auth_callback_error', reason: 'invalid_payload' },
            'Callback token missing sub claim'
          );
          reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token payload' });
          return;
        }

        // Sync user to database (upsert)
        try {
          const syncStart = Date.now();
          const user = await authService.syncUser(userId, payload.email);
          request.log.info(
            { event: 'auth_callback_success', userId, email: user.email, duration: Date.now() - syncStart },
            'User validated and synced via callback'
          );
          reply.send({ ok: true, user: { id: user.id, email: user.email } });
        } catch (syncErr) {
          const message = syncErr instanceof Error ? syncErr.message : 'Unknown error';
          request.log.error(
            { event: 'user_sync_failed', userId, error: message },
            'Failed to sync user to database'
          );
          reply.status(500).send({ error: 'Failed to complete authentication' });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        request.log.error(
          { event: 'auth_callback_error', error: message, stack: err instanceof Error ? err.stack : undefined },
          'Auth callback failed with exception'
        );
        reply.status(500).send({ error: 'Auth callback failed' });
      }
    }
  );

  // GET /api/auth/me - Return the currently authenticated user.
  fastify.get(
    '/api/auth/me',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        // authGuard should have already responded; defensive guard.
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      request.log.debug({ event: 'get_user_success', userId: user.id }, 'User profile retrieved');
      reply.send({ id: user.id, email: user.email });
    }
  );

  // POST /api/auth/refresh - Exchange a refresh token for new tokens.
  // Tokens are returned in the body; the Next.js API route sets cookies.
  fastify.post<{ Body: { refresh_token?: string } }>(
    '/api/auth/refresh',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        let refreshToken: string | null = null;
        let tokenSource = 'unknown';

        // Authorization header (Bearer) - used by the Next.js proxy and mobile/CLI clients
        if (request.headers.authorization) {
          try {
            refreshToken = extractBearerToken(request.headers.authorization);
            tokenSource = 'header';
          } catch {
            // Authorization header present but malformed; fall through to other sources
          }
        }

        // Request body
        const body = request.body as { refresh_token?: string } | undefined;
        if (!refreshToken && body?.refresh_token) {
          refreshToken = body.refresh_token;
          tokenSource = 'body';
        }

        // Cookie fallback (web browsers calling the backend directly)
        if (!refreshToken && request.cookies?.refresh_token) {
          refreshToken = request.cookies.refresh_token;
          tokenSource = 'cookie';
        }

        if (!refreshToken) {
          request.log.warn(
            { event: 'refresh_token_missing', attemptedSources: ['header', 'body', 'cookie'] },
            'Missing refresh token'
          );
          reply.status(401).send({ error: 'Missing refresh token' });
          return;
        }

        request.log.debug(
          { event: 'refresh_token_found', source: tokenSource },
          `Refresh token found in ${tokenSource}`
        );

        const supabase = getSupabaseClient();
        const refreshStart = Date.now();
        const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
        const duration = Date.now() - refreshStart;

        if (error || !data.session) {
          request.log.warn(
            { event: 'refresh_session_failed', error: error?.message, duration },
            'Failed to refresh session with Supabase'
          );
          reply.status(401).send({ error: 'Failed to refresh token' });
          return;
        }

        request.log.info({ event: 'token_refresh_success', duration }, 'Token refreshed successfully');

        reply.send({
          ok: true,
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        request.log.error(
          { event: 'refresh_token_error', error: message, stack: err instanceof Error ? err.stack : undefined },
          'Token refresh failed with exception'
        );
        reply.status(500).send({ error: 'Failed to refresh token' });
      }
    }
  );
}
