import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ConversationThreadService } from '../services/conversation-thread';
import { authGuard, getTokenFromRequest } from '../middleware/auth';

const conversationThreadService = new ConversationThreadService();

const registerThreadSchema = z.object({
  thread_id: z.string().min(1),
  candidate_id: z.string().min(1),
});

export async function conversationThreadRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/conversation-threads/:candidateId - List a candidate's conversation threads.
  fastify.get<{ Params: { candidateId: string } }>(
    '/api/conversation-threads/:candidateId',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { candidateId } = request.params as { candidateId: string };

      const threads = await conversationThreadService.listThreads(request.userId!, candidateId);
      reply.send(threads);
    }
  );

  // GET /api/conversation-threads/:candidateId/:threadId/messages - Fetch a thread's message
  // history, proxied from ai-server after verifying the thread belongs to the candidate.
  fastify.get<{ Params: { candidateId: string; threadId: string } }>(
    '/api/conversation-threads/:candidateId/:threadId/messages',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { candidateId, threadId } = request.params as { candidateId: string; threadId: string };

      try {
        const messages = await conversationThreadService.getThreadMessages(
          request.userId!,
          candidateId,
          threadId,
          getTokenFromRequest(request)!
        );

        if (!messages) {
          reply.status(404).send({ error: 'Thread not found' });
          return;
        }

        reply.send(messages);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch thread messages';
        request.log.error(
          { event: 'external_request_failed', service: 'ai-server', threadId, error: message },
          `Failed to proxy thread messages from ai-server: ${message}`
        );
        reply.status(502).send({ error: 'Failed to fetch thread messages' });
      }
    }
  );

  // POST /api/webhooks/conversation-threads - Register a new thread↔candidate mapping.
  // Called by ai-server when it mints a new thread_id; unauthenticated (service-to-service),
  // matching the existing precedent for /api/agent and the MCP transport.
  fastify.post<{ Body: unknown }>(
    '/api/webhooks/conversation-threads',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = registerThreadSchema.parse(request.body);

        const thread = await conversationThreadService.registerThread(body);
        reply.status(201).send(thread);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: 'Validation error', details: error.errors });
        } else {
          throw error;
        }
      }
    }
  );
}
