import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ProfileService } from '../services/profile';
import { ResumeParserService } from '../services/resume-parser';
import { UnsupportedFormatError } from '../services/resume-text-extractor';
import { transformProfile, transformProfiles } from '../services/profile-transformer';
import { authGuard } from '../middleware/auth';

const profileService = new ProfileService();
const resumeParserService = new ResumeParserService();

// summary is a Lexical SerializedEditorState (rich text), not a plain string.
const createProfileSchema = z.object({
  title: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  summary: z.record(z.any()).optional().nullable(),
  website: z.string().optional().nullable(),
  skills: z.any().optional(),
  projects: z.any().optional(),
  experiences: z.any().optional(),
  educations: z.any().optional(),
  links: z.any().optional(),
  template_id: z.string().optional().nullable(),
  theme_id: z.string().optional().nullable(),
});

const updateProfileSchema = z.object({
  title: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  summary: z.record(z.any()).optional().nullable(),
  website: z.string().optional().nullable(),
  skills: z.any().optional(),
  projects: z.any().optional(),
  experiences: z.any().optional(),
  educations: z.any().optional(),
  links: z.any().optional(),
  template_id: z.string().optional().nullable(),
  theme_id: z.string().optional().nullable(),
});

const listParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// JSON Schema for the parsed resume, used to document the parse endpoint
// response in Swagger/OpenAPI. Mirrors `parsedResumeSchema` (snake_case).
const nullableString = { type: ['string', 'null'] as const };
const stringArray = { type: 'array', items: { type: 'string' } };

const parsedResumeResponseSchema = {
  type: 'object',
  properties: {
    name: nullableString,
    email: nullableString,
    phone: nullableString,
    location: nullableString,
    summary: nullableString,
    website: nullableString,
    skills: stringArray,
    links: {
      type: 'array',
      items: {
        type: 'object',
        properties: { url: { type: 'string' }, social_media: { type: 'string' } },
      },
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: nullableString,
          description: nullableString,
          tech_stack: stringArray,
        },
      },
    },
    experiences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: nullableString,
          role: nullableString,
          start_date: nullableString,
          end_date: nullableString,
          description: nullableString,
          tech_stack: stringArray,
        },
      },
    },
    educations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institute: nullableString,
          course: nullableString,
          start_date: nullableString,
          end_date: nullableString,
          description: nullableString,
        },
      },
    },
  },
} as const;

const parseResumeSchema = {
  tags: ['Profiles'],
  summary: 'Parse a resume file into structured profile data',
  description:
    'Upload a resume (PDF, DOC, or DOCX) as multipart/form-data and receive ' +
    'structured profile data extracted via an LLM. Returns an empty result when ' +
    'no text can be extracted or extraction fails; rejects unsupported formats.',
  consumes: ['multipart/form-data'],
  security: [{ bearerAuth: [] }],
  // File is streamed via @fastify/multipart (not attached to body), so `file`
  // is documented but not marked required to avoid body-validation failure.
  body: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: 'Resume document (.pdf, .doc, or .docx)',
      },
    },
  },
  response: {
    200: parsedResumeResponseSchema,
    400: {
      type: 'object',
      properties: { error: { type: 'string' } },
    },
  },
} as const;

export async function profileRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/profile - Create profile
  fastify.post<{ Body: unknown }>(
    '/api/profile',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createProfileSchema.parse(request.body);
        const profile = await profileService.create(request.userId!, body);
        reply.status(201).send(transformProfile(profile));
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: 'Validation error', details: error.errors });
        } else {
          throw error;
        }
      }
    }
  );

  // POST /api/profile/resume/parse - Parse an uploaded resume into structured data
  fastify.post(
    '/api/profile/resume/parse',
    {
      preHandler: authGuard,
      schema: parseResumeSchema,
      // The `body` schema exists only to document the multipart file upload in
      // Swagger. @fastify/multipart streams the file instead of populating
      // request.body, so the default validator would reject every request with
      // "body must be object". Bypass input validation for this route.
      validatorCompiler: () => () => true,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.isMultipart()) {
        reply.status(400).send({
          error: 'Request must be multipart/form-data with a "file" field',
        });
        return;
      }

      const data = await request.file();
      if (!data) {
        reply.status(400).send({ error: 'No file uploaded' });
        return;
      }

      try {
        const buffer = await data.toBuffer();
        const parsed = await resumeParserService.parse(buffer, data.filename);
        reply.send(parsed);
      } catch (error) {
        if (error instanceof UnsupportedFormatError) {
          reply.status(400).send({ error: error.message });
        } else {
          throw error;
        }
      }
    }
  );

  // GET /api/profile/:id - Get profile
  fastify.get<{ Params: { id: string } }>(
    '/api/profile/:id',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const profile = await profileService.getById(id, request.userId!);
      if (!profile) {
        reply.status(404).send({ error: 'Profile not found' });
        return;
      }
      reply.send(transformProfile(profile));
    }
  );

  // PUT /api/profile/:id - Update profile
  fastify.put<{ Params: { id: string }; Body: unknown }>(
    '/api/profile/:id',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateProfileSchema.parse(request.body);
        const profile = await profileService.update(id, request.userId!, body);
        if (!profile) {
          reply.status(404).send({ error: 'Profile not found' });
          return;
        }
        reply.send(profile);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: 'Validation error', details: error.errors });
        } else {
          throw error;
        }
      }
    }
  );

  // PATCH /api/profile/:id - Partial update
  fastify.patch<{ Params: { id: string }; Body: unknown }>(
    '/api/profile/:id',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateProfileSchema.partial().parse(request.body);
        const profile = await profileService.patch(id, request.userId!, body);
        if (!profile) {
          reply.status(404).send({ error: 'Profile not found' });
          return;
        }
        reply.send(profile);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: 'Validation error', details: error.errors });
        } else {
          throw error;
        }
      }
    }
  );

  // DELETE /api/profile/:id - Delete profile
  fastify.delete<{ Params: { id: string } }>(
    '/api/profile/:id',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const deleted = await profileService.delete(id, request.userId!);
      if (!deleted) {
        reply.status(404).send({ error: 'Profile not found' });
        return;
      }
      reply.status(204).send();
    }
  );

  // GET /api/me/profiles - List user's profiles
  fastify.get<{ Querystring: unknown }>(
    '/api/me/profiles',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = listParamsSchema.parse(request.query);
        const result = await profileService.list(request.userId!, {
          page: query.page,
          limit: query.limit,
        });
        reply.send({
          ...result,
          items: transformProfiles(result.items),
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

  // GET /api/profiles - List profiles (legacy, same as /api/me/profiles)
  fastify.get<{ Querystring: unknown }>(
    '/api/profiles',
    { preHandler: authGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = listParamsSchema.parse(request.query);
        const result = await profileService.list(request.userId!, {
          page: query.page,
          limit: query.limit,
        });
        reply.send(result);
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
