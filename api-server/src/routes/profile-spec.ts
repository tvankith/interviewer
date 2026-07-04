import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ProfileSpecService } from '../services/profile-spec';
import { authGuard } from '../middleware/auth';

const profileSpecService = new ProfileSpecService();

const createProfileSpecSchema = z.object({
  name: z.string().min(1),
  content: z.string().optional().nullable(),
});

const updateProfileSpecSchema = z.object({
  name: z.string().optional(),
  content: z.string().optional().nullable(),
});

export async function profileSpecRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/profile-spec/:profileId - Create spec
  fastify.post<{ Params: { profileId: string }; Body: unknown }>(
    '/api/profile-spec/:profileId',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { profileId } = request.params as { profileId: string };
        const body = createProfileSpecSchema.parse(request.body);

        const spec = await profileSpecService.createSpec(request.userId!, profileId, body);
        reply.status(201).send(spec);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: 'Validation error', details: error.errors });
        } else if (error instanceof Error && error.message.includes('already exists')) {
          reply.status(409).send({ error: error.message });
        } else if (error instanceof Error && error.message.includes('not found')) {
          reply.status(404).send({ error: error.message });
        } else {
          throw error;
        }
      }
    }
  );

  // GET /api/profile-spec/:profileId - List specs
  fastify.get<{ Params: { profileId: string } }>(
    '/api/profile-spec/:profileId',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { profileId } = request.params as { profileId: string };

      const specs = await profileSpecService.listSpecs(request.userId!, profileId);
      if (!specs) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      reply.send(specs);
    }
  );

  // GET /api/profile-spec/:profileId/:specId - Get specific spec
  fastify.get<{ Params: { profileId: string; specId: string } }>(
    '/api/profile-spec/:profileId/:specId',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { profileId, specId } = request.params as { profileId: string; specId: string };

      const spec = await profileSpecService.getSpec(request.userId!, profileId, specId);
      if (!spec) {
        reply.status(404).send({ error: 'Spec not found' });
        return;
      }

      reply.send(spec);
    }
  );

  // PATCH /api/profile-spec/:profileId/:specId - Update spec
  fastify.patch<{ Params: { profileId: string; specId: string }; Body: unknown }>(
    '/api/profile-spec/:profileId/:specId',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { profileId, specId } = request.params as { profileId: string; specId: string };
        const body = updateProfileSpecSchema.parse(request.body);

        const spec = await profileSpecService.updateSpec(request.userId!, profileId, specId, body);
        if (!spec) {
          reply.status(404).send({ error: 'Spec not found' });
          return;
        }

        reply.send(spec);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: 'Validation error', details: error.errors });
        } else if (error instanceof Error && error.message.includes('already exists')) {
          reply.status(409).send({ error: error.message });
        } else {
          throw error;
        }
      }
    }
  );

  // DELETE /api/profile-spec/:profileId/:specId - Delete spec
  fastify.delete<{ Params: { profileId: string; specId: string } }>(
    '/api/profile-spec/:profileId/:specId',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { profileId, specId } = request.params as { profileId: string; specId: string };

      const deleted = await profileSpecService.deleteSpec(request.userId!, profileId, specId);
      if (!deleted) {
        reply.status(404).send({ error: 'Spec not found' });
        return;
      }

      reply.status(204).send();
    }
  );
}
