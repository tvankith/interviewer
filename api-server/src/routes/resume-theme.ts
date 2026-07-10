import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ResumeThemeService } from '../services/resume-theme';

const resumeThemeService = new ResumeThemeService();

const listParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

function transformTheme(theme: any) {
  return {
    id: theme.id,
    name: theme.name,
    version: theme.version,
    content: theme.content,
    is_public: theme.is_public,
    created_at: theme.created_at instanceof Date ? theme.created_at.toISOString() : theme.created_at,
    deleted_at: theme.deleted_at instanceof Date ? theme.deleted_at.toISOString() : theme.deleted_at ?? null,
  };
}

// Read-only for MVP — theme *selection* is what's newly wired up (mirroring
// how resume_template's own selection was the gap, not authoring). No
// designer UI exists yet for authoring themes, so there's no create/update
// surface here.
export async function resumeThemeRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/resume-themes/default — must be registered before /:id
  fastify.get(
    '/api/resume-themes/default',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const theme = await resumeThemeService.getDefault();
      if (!theme) {
        reply.status(404).send({ error: 'No themes found' });
        return;
      }
      reply.send(transformTheme(theme));
    }
  );

  // GET /api/resume-themes - List all themes
  fastify.get<{ Querystring: unknown }>(
    '/api/resume-themes',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = listParamsSchema.parse(request.query);
        const result = await resumeThemeService.list({ page: query.page, limit: query.limit });
        reply.send({
          ...result,
          items: result.items.map(transformTheme),
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: 'Validation error', details: error.errors });
        } else {
          throw error;
        }
      }
    }
  );

  // GET /api/resume-themes/:id
  fastify.get<{ Params: { id: string } }>(
    '/api/resume-themes/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const theme = await resumeThemeService.getById(id);
      if (!theme) {
        reply.status(404).send({ error: 'Resume theme not found' });
        return;
      }
      reply.send(transformTheme(theme));
    }
  );
}
