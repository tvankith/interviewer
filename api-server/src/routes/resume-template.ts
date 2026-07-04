import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ResumeTemplateService } from '../services/resume-template';
import { authGuard } from '../middleware/auth';

const resumeTemplateService = new ResumeTemplateService();

const createResumeTemplateSchema = z.object({
  name: z.string().min(1),
  version: z.string().default('1.0.0'),
  is_public: z.boolean().default(false),
  content: z.object({ html: z.string() }),
  thumbnail_url: z.string().optional().nullable(),
});

const updateResumeTemplateSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  is_public: z.boolean().optional(),
  content: z.object({ html: z.string() }).optional(),
  thumbnail_url: z.string().optional().nullable(),
});

const listParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

function transformTemplate(template: any) {
  return {
    id: template.id,
    name: template.name,
    version: template.version,
    content: template.content,
    thumbnail_url: template.thumbnail_url,
    is_public: template.is_public,
    created_by: template.created_by,
    created_at: template.created_at instanceof Date ? template.created_at.toISOString() : template.created_at,
    deleted_at: template.deleted_at instanceof Date ? template.deleted_at.toISOString() : template.deleted_at ?? null,
  };
}

export async function resumeTemplateRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/resume-templates/default — must be registered before /:id
  fastify.get(
    '/api/resume-templates/default',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const template = await resumeTemplateService.getDefault();
      if (!template) {
        reply.status(404).send({ error: 'No templates found' });
        return;
      }
      reply.send(transformTemplate(template));
    }
  );

  // GET /api/resume-templates - List all templates
  fastify.get<{ Querystring: unknown }>(
    '/api/resume-templates',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = listParamsSchema.parse(request.query);
        const result = await resumeTemplateService.list({ page: query.page, limit: query.limit });
        reply.send({
          ...result,
          items: result.items.map(transformTemplate),
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

  // GET /api/resume-templates/:id - Get template by id
  fastify.get<{ Params: { id: string } }>(
    '/api/resume-templates/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const template = await resumeTemplateService.getById(id);
      if (!template) {
        reply.status(404).send({ error: 'Resume template not found' });
        return;
      }
      reply.send(transformTemplate(template));
    }
  );

  // POST /api/resume-templates - Create template (auth required)
  fastify.post<{ Body: unknown }>(
    '/api/resume-templates',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createResumeTemplateSchema.parse(request.body);
        const template = await resumeTemplateService.create(body, request.userId!);
        reply.status(201).send(transformTemplate(template));
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: 'Validation error', details: error.errors });
        } else {
          throw error;
        }
      }
    }
  );

  // PUT /api/resume-templates/:id - Update template (auth required)
  fastify.put<{ Params: { id: string }; Body: unknown }>(
    '/api/resume-templates/:id',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateResumeTemplateSchema.parse(request.body);
        const template = await resumeTemplateService.update(id, body);
        if (!template) {
          reply.status(404).send({ error: 'Resume template not found' });
          return;
        }
        reply.send(transformTemplate(template));
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: 'Validation error', details: error.errors });
        } else {
          throw error;
        }
      }
    }
  );

  // PATCH /api/resume-templates/:id - Partial update (auth required)
  fastify.patch<{ Params: { id: string }; Body: unknown }>(
    '/api/resume-templates/:id',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateResumeTemplateSchema.partial().parse(request.body);
        const template = await resumeTemplateService.update(id, body);
        if (!template) {
          reply.status(404).send({ error: 'Resume template not found' });
          return;
        }
        reply.send(transformTemplate(template));
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: 'Validation error', details: error.errors });
        } else {
          throw error;
        }
      }
    }
  );

  // DELETE /api/resume-templates/:id - Soft delete (auth required)
  fastify.delete<{ Params: { id: string } }>(
    '/api/resume-templates/:id',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const deleted = await resumeTemplateService.delete(id);
      if (!deleted) {
        reply.status(404).send({ error: 'Resume template not found' });
        return;
      }
      reply.status(204).send();
    }
  );
}
