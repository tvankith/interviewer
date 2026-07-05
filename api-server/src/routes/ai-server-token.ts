import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authGuard } from '../middleware/auth';
import { issueAiServerToken } from '../services/ai-server-token';

export async function aiServerTokenRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/ai-server/token - Mint a short-lived ai-server session token for the
  // authenticated candidate. The frontend calls this (via the Next.js proxy, using
  // the existing Supabase-backed session cookie) and caches the result itself to
  // authenticate its own direct, client-side requests to ai-server.
  fastify.post(
    '/api/ai-server/token',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const token = await issueAiServerToken(request.userId!);
        reply.send(token);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to issue ai-server token';
        request.log.error(
          { event: 'external_request_failed', service: 'ai-server', error: message },
          `Failed to issue ai-server token: ${message}`
        );
        reply.status(502).send({ error: 'Failed to issue ai-server token' });
      }
    }
  );
}
