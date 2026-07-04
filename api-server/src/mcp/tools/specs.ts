import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PrismaClient } from '@prisma/client';
import { withCandidate } from '../with-candidate.js';

export function registerSpecsTools(server: McpServer, prisma: PrismaClient): void {
  server.tool(
    'get_profile_specs',
    'List all profile specs (notes, preferences, stories) for the candidate.',
    {},
    async () => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        const specs = await prisma.profile_spec.findMany({
          where: { candidate_profile_id: candidate.id, deleted_at: null },
          orderBy: { created_at: 'asc' },
        });
        return {
          specs: specs.map((s) => ({
            id: s.id,
            name: s.name,
            content: s.content,
            created_at: s.created_at?.toISOString() ?? null,
            updated_at: s.updated_at?.toISOString() ?? null,
          })),
        };
      });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    'get_profile_spec',
    'Get a single profile spec by name. Returns full markdown content.',
    { name: z.string().describe('Name of the profile spec to retrieve') },
    async ({ name }) => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        const spec = await prisma.profile_spec.findFirst({
          where: { candidate_profile_id: candidate.id, name, deleted_at: null },
        });
        if (!spec) return { error: `Profile spec '${name}' not found` };
        return {
          id: spec.id,
          name: spec.name,
          content: spec.content,
          created_at: spec.created_at?.toISOString() ?? null,
          updated_at: spec.updated_at?.toISOString() ?? null,
        };
      });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    'read_resume_spec',
    'Read a resume specification from the ProfileSpec database table.',
    {
      name: z
        .string()
        .default('resume.md')
        .describe('Name of the spec to read (defaults to "resume.md")'),
    },
    async ({ name }) => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        const spec = await prisma.profile_spec.findFirst({
          where: { candidate_profile_id: candidate.id, name, deleted_at: null },
        });
        if (!spec) return { error: `Resume spec '${name}' not found` };
        return {
          status: 'success',
          name: spec.name,
          content: spec.content,
          size_bytes: spec.content ? spec.content.length : 0,
          created_at: spec.created_at?.toISOString() ?? null,
          updated_at: spec.updated_at?.toISOString() ?? null,
        };
      });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    'list_resume_files',
    'List all available resume specifications for the candidate.',
    {},
    async () => {
      const result = await withCandidate(prisma, async ({ candidate }) => {
        const specs = await prisma.profile_spec.findMany({
          where: { candidate_profile_id: candidate.id, deleted_at: null },
          orderBy: { created_at: 'asc' },
        });
        return {
          status: 'success',
          specs: specs.map((s) => ({
            id: s.id,
            name: s.name,
            size_bytes: s.content ? s.content.length : 0,
            created_at: s.created_at?.toISOString() ?? null,
            updated_at: s.updated_at?.toISOString() ?? null,
          })),
          count: specs.length,
        };
      });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );
}
