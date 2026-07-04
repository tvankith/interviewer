import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sseManager } from '../utils/sse-manager.js';

export async function sseRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: { id: string } }>(
    '/api/profile/:id/events',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const profileId = request.params.id;

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      reply.raw.flushHeaders();

      const send = (event: object) => {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      sseManager.subscribe(profileId, send);

      reply.raw.on('close', () => {
        sseManager.unsubscribe(profileId, send);
      });

      // Keep alive ping every 30s
      const keepAlive = setInterval(() => {
        reply.raw.write(': ping\n\n');
      }, 30_000);

      reply.raw.on('close', () => clearInterval(keepAlive));

      // Hijack — Fastify must not send its own response
      await new Promise<void>((resolve) => reply.raw.on('close', resolve));
    }
  );
}
